const db = require("./connection");

function addToWatchlist(discordId, symbolOrQuery, chain, tokenAddress) {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO watchlist_items (discord_id, symbol_or_query, chain, token_address) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(discordId, symbolOrQuery.toUpperCase(), chain || null, tokenAddress || null);
  return result.changes > 0;
}

function removeFromWatchlist(discordId, symbolOrQuery) {
  const result = db
    .prepare("DELETE FROM watchlist_items WHERE discord_id = ? AND symbol_or_query = ?")
    .run(discordId, symbolOrQuery.toUpperCase());
  return result.changes > 0;
}

function getWatchlist(discordId) {
  return db
    .prepare("SELECT * FROM watchlist_items WHERE discord_id = ? ORDER BY created_at ASC")
    .all(discordId);
}

function countWatchlist(discordId) {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM watchlist_items WHERE discord_id = ?")
    .get(discordId);
  return row.count;
}

module.exports = {
  addToWatchlist,
  removeFromWatchlist,
  getWatchlist,
  countWatchlist
};
