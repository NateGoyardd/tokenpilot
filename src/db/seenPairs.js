const db = require("./connection");

function hasSeenPair(pairAddress) {
  const row = db.prepare("SELECT pair_address FROM seen_pairs WHERE pair_address = ?").get(pairAddress);
  return Boolean(row);
}

function markPairSeen(pairAddress, chain) {
  db.prepare("INSERT OR IGNORE INTO seen_pairs (pair_address, chain) VALUES (?, ?)").run(pairAddress, chain);
}

function pruneOldSeenPairs(olderThanDays) {
  db.prepare("DELETE FROM seen_pairs WHERE first_seen_at < datetime('now', ?)").run(
    "-" + olderThanDays + " days"
  );
}

module.exports = {
  hasSeenPair,
  markPairSeen,
  pruneOldSeenPairs
};
