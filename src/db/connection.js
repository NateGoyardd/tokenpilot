const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const config = require("../config");

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDirExists(config.databasePath);

const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = `
CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  is_premium INTEGER NOT NULL DEFAULT 0,
  paper_balance_usd REAL NOT NULL DEFAULT 10000,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  symbol_or_query TEXT NOT NULL,
  chain TEXT,
  token_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(discord_id, symbol_or_query)
);

CREATE TABLE IF NOT EXISTS price_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  symbol_or_query TEXT NOT NULL,
  chain TEXT,
  token_address TEXT,
  direction TEXT NOT NULL,
  target_price REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  triggered_at TEXT
);

CREATE TABLE IF NOT EXISTS tracked_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  label TEXT,
  last_signature TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(discord_id, chain, wallet_address)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  symbol_or_query TEXT NOT NULL,
  side TEXT NOT NULL,
  entry_price REAL,
  exit_price REAL,
  size_usd REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS paper_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  symbol_or_query TEXT NOT NULL,
  chain TEXT,
  token_address TEXT,
  quantity REAL NOT NULL,
  avg_entry_price REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(discord_id, symbol_or_query)
);

CREATE TABLE IF NOT EXISTS paper_trade_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  symbol_or_query TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  realized_pnl_usd REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS seen_pairs (
  pair_address TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feed_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  feed_type TEXT NOT NULL,
  chain TEXT,
  query TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(guild_id, channel_id, feed_type, chain, query)
);
`;

db.exec(schema);

module.exports = db;
