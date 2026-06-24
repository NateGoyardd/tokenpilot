const db = require("./connection");

function subscribe(guildId, channelId, feedType, chain, query) {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO feed_subscriptions (guild_id, channel_id, feed_type, chain, query) VALUES (?, ?, ?, ?, ?)"
  );
  const result = stmt.run(guildId, channelId, feedType, chain || null, query || null);
  return result.changes > 0;
}

function unsubscribe(guildId, channelId, feedType, chain) {
  const result = db
    .prepare(
      "DELETE FROM feed_subscriptions WHERE guild_id = ? AND channel_id = ? AND feed_type = ? AND (chain = ? OR chain IS NULL)"
    )
    .run(guildId, channelId, feedType, chain || null);
  return result.changes > 0;
}

function getActiveSubscriptions(feedType) {
  return db
    .prepare("SELECT * FROM feed_subscriptions WHERE feed_type = ? AND is_active = 1")
    .all(feedType);
}

function getGuildSubscriptions(guildId) {
  return db.prepare("SELECT * FROM feed_subscriptions WHERE guild_id = ? AND is_active = 1").all(guildId);
}

module.exports = {
  subscribe,
  unsubscribe,
  getActiveSubscriptions,
  getGuildSubscriptions
};
