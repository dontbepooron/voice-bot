-- Migration 001: Initialize core tables

CREATE TABLE IF NOT EXISTS owners (
  guildId TEXT NOT NULL,
  userId TEXT NOT NULL,
  addedAt INTEGER NOT NULL,
  PRIMARY KEY (guildId, userId)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guildId TEXT NOT NULL,
  actorId TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS guild_config (
  guildId TEXT PRIMARY KEY,
  prefix TEXT,
  loggingChannelId TEXT,
  settings TEXT
);

CREATE INDEX IF NOT EXISTS idx_owners_guild ON owners(guildId);
CREATE INDEX IF NOT EXISTS idx_audit_guild ON audit_logs(guildId, timestamp);
