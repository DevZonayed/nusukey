-- NusukKey D1 schema. Safe to re-run (IF NOT EXISTS everywhere).
CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,            -- full code, e.g. NG-vW7So71R
  sn INTEGER NOT NULL,              -- serial number, newest = highest (browsers store seen serials as ranges)
  added_at INTEGER NOT NULL,
  owner_hash TEXT,
  copies INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0, -- 0 = not pinned, otherwise pin time (newest pin first)
  imported INTEGER NOT NULL DEFAULT 0, -- 1 = bulk-imported from a public archive
  last_copied_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS codes_sn ON codes (sn);
CREATE INDEX IF NOT EXISTS codes_pinned ON codes (pinned) WHERE pinned > 0;
CREATE INDEX IF NOT EXISTS codes_owner ON codes (owner_hash, added_at) WHERE owner_hash IS NOT NULL; -- archive imports skip this index

CREATE TABLE IF NOT EXISTS events (
  key_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('copy','skip','report')),
  at INTEGER NOT NULL,
  PRIMARY KEY (key_hash, code, kind)
);
CREATE INDEX IF NOT EXISTS events_at ON events (at);

CREATE TABLE IF NOT EXISTS daily (
  day TEXT NOT NULL,      -- YYYY-MM-DD, or 'all' for running totals (copies_total, codes_total, ver)
  metric TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric)
);
