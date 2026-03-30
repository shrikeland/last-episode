-- Recommendation history: tracks which titles were recommended to each user
-- Used to prevent the same titles from being suggested repeatedly

CREATE TABLE recommendation_history (
  id         UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id    INTEGER NOT NULL,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendation_history_user_created
  ON recommendation_history (user_id, created_at DESC);

ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rh_select" ON recommendation_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rh_insert" ON recommendation_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rh_delete" ON recommendation_history FOR DELETE USING (auth.uid() = user_id);