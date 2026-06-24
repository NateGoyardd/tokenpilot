const db = require("./connection");

function logTrade(discordId, symbolOrQuery, side, entryPrice, exitPrice, sizeUsd, notes) {
  const stmt = db.prepare(
    "INSERT INTO journal_entries (discord_id, symbol_or_query, side, entry_price, exit_price, size_usd, notes) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const result = stmt.run(
    discordId,
    symbolOrQuery.toUpperCase(),
    side,
    entryPrice ?? null,
    exitPrice ?? null,
    sizeUsd ?? null,
    notes ?? null
  );
  return result.lastInsertRowid;
}

function getUserJournal(discordId, limit) {
  return db
    .prepare("SELECT * FROM journal_entries WHERE discord_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(discordId, limit || 20);
}

function getPnlSummary(discordId) {
  const rows = db
    .prepare(
      "SELECT entry_price, exit_price, size_usd, side FROM journal_entries WHERE discord_id = ? AND entry_price IS NOT NULL AND exit_price IS NOT NULL"
    )
    .all(discordId);

  let totalPnl = 0;
  let wins = 0;
  let losses = 0;

  for (const row of rows) {
    if (!row.size_usd || !row.entry_price) {
      continue;
    }
    const units = row.size_usd / row.entry_price;
    const pnl = row.side === "short"
      ? units * (row.entry_price - row.exit_price)
      : units * (row.exit_price - row.entry_price);
    totalPnl += pnl;
    if (pnl >= 0) {
      wins += 1;
    } else {
      losses += 1;
    }
  }

  return {
    totalPnl,
    wins,
    losses,
    totalClosedTrades: wins + losses
  };
}

function getLeaderboard(limit) {
  const discordIds = db.prepare("SELECT DISTINCT discord_id FROM journal_entries").all();
  const results = discordIds.map((row) => {
    const summary = getPnlSummary(row.discord_id);
    return { discordId: row.discord_id, ...summary };
  });
  results.sort((a, b) => b.totalPnl - a.totalPnl);
  return results.slice(0, limit || 10);
}

module.exports = {
  logTrade,
  getUserJournal,
  getPnlSummary,
  getLeaderboard
};
