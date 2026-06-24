const db = require("./connection");

function trackWallet(discordId, channelId, chain, walletAddress, label) {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO tracked_wallets (discord_id, channel_id, chain, wallet_address, label) VALUES (?, ?, ?, ?, ?)"
  );
  const result = stmt.run(discordId, channelId, chain, walletAddress, label || null);
  return result.changes > 0;
}

function untrackWallet(discordId, chain, walletAddress) {
  const result = db
    .prepare("DELETE FROM tracked_wallets WHERE discord_id = ? AND chain = ? AND wallet_address = ?")
    .run(discordId, chain, walletAddress);
  return result.changes > 0;
}

function getUserTrackedWallets(discordId) {
  return db
    .prepare("SELECT * FROM tracked_wallets WHERE discord_id = ? AND is_active = 1 ORDER BY created_at ASC")
    .all(discordId);
}

function countTrackedWallets(discordId) {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM tracked_wallets WHERE discord_id = ? AND is_active = 1")
    .get(discordId);
  return row.count;
}

function getAllActiveTrackedWallets() {
  return db.prepare("SELECT * FROM tracked_wallets WHERE is_active = 1").all();
}

function updateLastSignature(id, signature) {
  db.prepare("UPDATE tracked_wallets SET last_signature = ? WHERE id = ?").run(signature, id);
}

module.exports = {
  trackWallet,
  untrackWallet,
  getUserTrackedWallets,
  countTrackedWallets,
  getAllActiveTrackedWallets,
  updateLastSignature
};
