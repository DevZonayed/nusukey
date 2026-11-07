CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,
  added_at INTEGER NOT NULL,
  owner_hash TEXT,
  copies INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  last_copied_at INTEGER
);
CREATE INDEX IF NOT EXISTS codes_pick ON codes (reports, copies, added_at DESC);
CREATE INDEX IF NOT EXISTS codes_owner ON codes (owner_hash, added_at);

CREATE TABLE IF NOT EXISTS events (
  key_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('copy','skip','report')),
  at INTEGER NOT NULL,
  PRIMARY KEY (key_hash, code, kind)
);

CREATE TABLE IF NOT EXISTS daily (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric)
);

CREATE TABLE IF NOT EXISTS presence (
  key_hash TEXT PRIMARY KEY,
  seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS presence_seen ON presence (seen_at);

CREATE INDEX IF NOT EXISTS codes_added ON codes (added_at);

CREATE TABLE IF NOT EXISTS snapshot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  body TEXT NOT NULL,
  built_at INTEGER NOT NULL
);
