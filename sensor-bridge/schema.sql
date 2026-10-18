CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY,
  node TEXT NOT NULL,
  label TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  stale_after_seconds INTEGER NOT NULL
);
-- One latest value per measurement, not an ever-growing event log.
