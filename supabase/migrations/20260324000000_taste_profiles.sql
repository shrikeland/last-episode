-- Unit 11: AI Recommendations — Taste Profiles table

CREATE TABLE taste_profiles (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT taste_profiles_unique_user UNIQUE (user_id)
);

CREATE INDEX idx_taste_profiles_user_id ON taste_profiles (user_id);

ALTER TABLE taste_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taste_profiles_select" ON taste_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "taste_profiles_insert" ON taste_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "taste_profiles_update" ON taste_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "taste_profiles_delete" ON taste_profiles FOR DELETE USING (auth.uid() = user_id);
