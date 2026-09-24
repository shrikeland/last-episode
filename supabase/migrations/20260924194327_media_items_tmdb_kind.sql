-- TMDB numbers movies and TV shows in separate id spaces: movie 1399 and tv 1399
-- are different titles. Uniqueness and "already in library" checks must use the
-- pair (tmdb_kind, tmdb_id), not tmdb_id alone.
--
-- tmdb_kind is derived from type — the app always fetches movie|animation from
-- /movie/{id} and tv|anime from /tv/{id} (see normalizeType in
-- lib/tmdb/tmdb.service.ts), and type is never updated after insert.
-- A STORED generated column backfills every existing row on ADD COLUMN and can
-- never drift from type. Mirror of tmdbKindOf() in lib/tmdb/kind.ts.

ALTER TABLE media_items
  ADD COLUMN tmdb_kind TEXT NOT NULL
    GENERATED ALWAYS AS (
      CASE WHEN type IN ('movie', 'animation') THEN 'movie' ELSE 'tv' END
    ) STORED;

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_unique_user_tmdb;
ALTER TABLE media_items
  ADD CONSTRAINT media_items_unique_user_kind_tmdb UNIQUE (user_id, tmdb_kind, tmdb_id);

-- Anti-repeat history: kind is unknown for existing rows (no type column there),
-- so NULL means "legacy row, matches either kind". Rows age out of the 45-day
-- window on their own; new rows always carry a kind.
ALTER TABLE recommendation_history
  ADD COLUMN tmdb_kind TEXT CHECK (tmdb_kind IN ('movie', 'tv'));
