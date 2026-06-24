const db = require("./connection");

function createAlert(discordId, channelId, symbolOrQuery, chain, tokenAddress, direction, targetPrice) {
  const stmt = db.prepare(
    "INSERT INTO price_alerts (discord_id, channel_id, symbol_or_query, chain, token_address, direction, target_price) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const result = stmt.run(
    discordId,
    channelId,
    symbolOrQuery.toUpperCase(),
    chain || null,
    tokenAddress || null,
    direction,
    targetPrice
  );
  return result.lastInsertRowid;
}

function getActiveAlerts() {
  return db.prepare("SELECT * FROM price_alerts WHERE is_active = 1").all();
}

function getUserAlerts(discordId) {
  return db
    .prepare("SELECT * FROM price_alerts WHERE discord_id = ? AND is_active = 1 ORDER BY created_at ASC")
    .all(discordId);
}

function countActiveAlerts(discordId) {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM price_alerts WHERE discord_id = ? AND is_active = 1")
    .get(discordId);
  return row.count;
}

function deactivateAlert(alertId) {
  db.prepare("UPDATE price_alerts SET is_active = 0, triggered_at = datetime('now') WHERE id = ?").run(alertId);
}

function removeAlert(discordId, alertId) {
  const result = db
    .prepare("DELETE FROM price_alerts WHERE id = ? AND discord_id = ?")
    .run(alertId, discordId);
  return result.changes > 0;
}

module.exports = {
  createAlert,
  getActiveAlerts,
  getUserAlerts,
  countActiveAlerts,
  deactivateAlert,
  removeAlert
};
