const db = require("./connection");

function ensureUser(discordId) {
  const existing = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(discordId);
  if (existing) {
    return existing;
  }
  db.prepare("INSERT INTO users (discord_id) VALUES (?)").run(discordId);
  return db.prepare("SELECT * FROM users WHERE discord_id = ?").get(discordId);
}

function setPremium(discordId, isPremium) {
  ensureUser(discordId);
  db.prepare("UPDATE users SET is_premium = ? WHERE discord_id = ?").run(isPremium ? 1 : 0, discordId);
}

function isPremium(discordId) {
  const user = ensureUser(discordId);
  return Boolean(user.is_premium);
}

function getPaperBalance(discordId) {
  const user = ensureUser(discordId);
  return user.paper_balance_usd;
}

function setPaperBalance(discordId, newBalance) {
  ensureUser(discordId);
  db.prepare("UPDATE users SET paper_balance_usd = ? WHERE discord_id = ?").run(newBalance, discordId);
}

module.exports = {
  ensureUser,
  setPremium,
  isPremium,
  getPaperBalance,
  setPaperBalance
};
