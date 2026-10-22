-- Independent of the sensor bridge's tables and migration history.
CREATE TABLE IF NOT EXISTS article_likes (
  post_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (post_id, visitor_id)
) WITHOUT ROWID;
