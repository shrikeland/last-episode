-- Last Episode — Unit 5: Anime Filler Detection
-- Run: npx supabase db push

-- ============================================================
-- FILLER EPISODES — глобальный кэш (без user_id)
-- ============================================================
CREATE TABLE filler_episodes (
  tmdb_id                 INTEGER NOT NULL,
  absolute_episode_number INTEGER NOT NULL,
  PRIMARY KEY (tmdb_id, absolute_episode_number)
);

-- ============================================================
-- ANIME FILLER CACHE — статус обработки по тайтлу
-- ============================================================
CREATE TABLE anime_filler_cache (
  tmdb_id    INTEGER PRIMARY KEY,
  status     TEXT NOT NULL CHECK (status IN ('fetched', 'not_found', 'error')),
  source_url TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EPISODES — добавить поле is_filler
-- ============================================================
ALTER TABLE episodes
  ADD COLUMN is_filler BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_filler_episodes_tmdb_id ON filler_episodes (tmdb_id);
CREATE INDEX idx_episodes_is_filler      ON episodes (season_id, is_filler);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- filler_episodes: SELECT для авторизованных, запись только через Service Role
ALTER TABLE filler_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "filler_episodes_select" ON filler_episodes
  FOR SELECT TO authenticated USING (true);

-- anime_filler_cache: аналогично
ALTER TABLE anime_filler_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anime_filler_cache_select" ON anime_filler_cache
  FOR SELECT TO authenticated USING (true);