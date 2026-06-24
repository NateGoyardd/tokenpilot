const db = require("./connection");
const usersRepo = require("./users");

const STARTING_BALANCE = 10000;

function getPosition(discordId, symbolOrQuery) {
  return db
    .prepare("SELECT * FROM paper_positions WHERE discord_id = ? AND symbol_or_query = ?")
    .get(discordId, symbolOrQuery.toUpperCase());
}

function getAllPositions(discordId) {
  return db
    .prepare("SELECT * FROM paper_positions WHERE discord_id = ? ORDER BY symbol_or_query ASC")
    .all(discordId);
}

function buy(discordId, symbolOrQuery, chain, tokenAddress, usdAmount, currentPrice) {
  usersRepo.ensureUser(discordId);
  const balance = usersRepo.getPaperBalance(discordId);

  if (usdAmount > balance) {
    return { ok: false, reason: "insufficient_balance", balance };
  }
  if (currentPrice <= 0) {
    return { ok: false, reason: "invalid_price" };
  }

  const quantity = usdAmount / currentPrice;
  const symbol = symbolOrQuery.toUpperCase();
  const existing = getPosition(discordId, symbol);

  if (existing) {
    const newQuantity = existing.quantity + quantity;
    const newAvgPrice =
      (existing.quantity * existing.avg_entry_price + quantity * currentPrice) / newQuantity;
    db.prepare(
      "UPDATE paper_positions SET quantity = ?, avg_entry_price = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newQuantity, newAvgPrice, existing.id);
  } else {
    db.prepare(
      "INSERT INTO paper_positions (discord_id, symbol_or_query, chain, token_address, quantity, avg_entry_price) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(discordId, symbol, chain || null, tokenAddress || null, quantity, currentPrice);
  }

  usersRepo.setPaperBalance(discordId, balance - usdAmount);

  db.prepare(
    "INSERT INTO paper_trade_history (discord_id, symbol_or_query, side, quantity, price) VALUES (?, ?, 'buy', ?, ?)"
  ).run(discordId, symbol, quantity, currentPrice);

  return { ok: true, quantity, price: currentPrice, newBalance: balance - usdAmount };
}

function sell(discordId, symbolOrQuery, percentToSell, currentPrice) {
  const symbol = symbolOrQuery.toUpperCase();
  const position = getPosition(discordId, symbol);

  if (!position || position.quantity <= 0) {
    return { ok: false, reason: "no_position" };
  }
  if (currentPrice <= 0) {
    return { ok: false, reason: "invalid_price" };
  }

  const fraction = Math.min(Math.max(percentToSell, 0), 100) / 100;
  const quantityToSell = position.quantity * fraction;
  const proceedsUsd = quantityToSell * currentPrice;
  const costBasisUsd = quantityToSell * position.avg_entry_price;
  const realizedPnl = proceedsUsd - costBasisUsd;
  const remainingQuantity = position.quantity - quantityToSell;

  const balance = usersRepo.getPaperBalance(discordId);
  usersRepo.setPaperBalance(discordId, balance + proceedsUsd);

  if (remainingQuantity <= 0.0000001) {
    db.prepare("DELETE FROM paper_positions WHERE id = ?").run(position.id);
  } else {
    db.prepare(
      "UPDATE paper_positions SET quantity = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(remainingQuantity, position.id);
  }

  db.prepare(
    "INSERT INTO paper_trade_history (discord_id, symbol_or_query, side, quantity, price, realized_pnl_usd) VALUES (?, ?, 'sell', ?, ?, ?)"
  ).run(discordId, symbol, quantityToSell, currentPrice, realizedPnl);

  return {
    ok: true,
    quantitySold: quantityToSell,
    proceedsUsd,
    realizedPnl,
    newBalance: balance + proceedsUsd,
    remainingQuantity
  };
}

function getRealizedPnlTotal(discordId) {
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(realized_pnl_usd), 0) as total FROM paper_trade_history WHERE discord_id = ? AND side = 'sell'"
    )
    .get(discordId);
  return row.total;
}

function getPaperLeaderboard(limit) {
  const rows = db
    .prepare(
      "SELECT u.discord_id, u.paper_balance_usd, COALESCE(SUM(h.realized_pnl_usd), 0) as realized_pnl FROM users u LEFT JOIN paper_trade_history h ON h.discord_id = u.discord_id AND h.side = 'sell' GROUP BY u.discord_id ORDER BY (u.paper_balance_usd - " +
        STARTING_BALANCE +
        ") DESC LIMIT ?"
    )
    .all(limit || 10);
  return rows.map((row) => ({
    discordId: row.discord_id,
    balance: row.paper_balance_usd,
    realizedPnl: row.realized_pnl,
    netPnl: row.paper_balance_usd - STARTING_BALANCE
  }));
}

module.exports = {
  getPosition,
  getAllPositions,
  buy,
  sell,
  getRealizedPnlTotal,
  getPaperLeaderboard,
  STARTING_BALANCE
};
