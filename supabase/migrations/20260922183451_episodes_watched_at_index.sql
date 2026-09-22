-- Watch timeline on /stats reads episodes by watched_at range.
-- Partial index: unwatched episodes (watched_at IS NULL) are the majority and never queried by date.
CREATE INDEX IF NOT EXISTS idx_episodes_watched_at
  ON episodes (watched_at DESC)
  WHERE watched_at IS NOT NULL;
