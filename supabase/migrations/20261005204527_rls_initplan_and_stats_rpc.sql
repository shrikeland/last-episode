-- 1. RLS: evaluate auth.uid() once per query instead of once per row.
--
-- Supabase advisor 0003_auth_rls_initplan flagged 19 policies. A bare auth.uid()
-- in a policy is re-run for every row; wrapped in (select ...) Postgres runs it
-- once as an InitPlan. The episodes policy also runs an EXISTS join per row, so
-- bulk episode reads (stats, title page, progress) paid for it the most.
-- Predicates are unchanged: only the evaluation plan differs. ALTER POLICY keeps
-- names, roles and commands as they are.

ALTER POLICY media_items_select ON public.media_items USING ((select auth.uid()) = user_id);
ALTER POLICY media_items_insert ON public.media_items WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY media_items_update ON public.media_items USING ((select auth.uid()) = user_id);
ALTER POLICY media_items_delete ON public.media_items USING ((select auth.uid()) = user_id);

ALTER POLICY seasons_all ON public.seasons USING (
  EXISTS (
    SELECT 1 FROM public.media_items
    WHERE media_items.id = seasons.media_item_id
      AND media_items.user_id = (select auth.uid())
  )
);

ALTER POLICY episodes_all ON public.episodes USING (
  EXISTS (
    SELECT 1
    FROM public.seasons
    JOIN public.media_items ON media_items.id = seasons.media_item_id
    WHERE seasons.id = episodes.season_id
      AND media_items.user_id = (select auth.uid())
  )
);

ALTER POLICY profiles_insert ON public.profiles WITH CHECK ((select auth.uid()) = id);
ALTER POLICY profiles_update ON public.profiles USING ((select auth.uid()) = id);

ALTER POLICY taste_profiles_select ON public.taste_profiles USING ((select auth.uid()) = user_id);
ALTER POLICY taste_profiles_insert ON public.taste_profiles WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY taste_profiles_update ON public.taste_profiles USING ((select auth.uid()) = user_id);
ALTER POLICY taste_profiles_delete ON public.taste_profiles USING ((select auth.uid()) = user_id);

ALTER POLICY rh_select ON public.recommendation_history USING ((select auth.uid()) = user_id);
ALTER POLICY rh_insert ON public.recommendation_history WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY rh_delete ON public.recommendation_history USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view their friendships" ON public.friendships
  USING (user_id = (select auth.uid()) OR friend_id = (select auth.uid()));
ALTER POLICY "Users can send friend requests" ON public.friendships
  WITH CHECK (user_id = (select auth.uid()));
ALTER POLICY "Recipients can accept requests" ON public.friendships
  USING (friend_id = (select auth.uid()))
  WITH CHECK (friend_id = (select auth.uid()) AND status = 'accepted');
ALTER POLICY "Users can cancel or decline" ON public.friendships
  USING (user_id = (select auth.uid()) OR friend_id = (select auth.uid()));

-- 2. Watched minutes per title, for /stats and the profile page.
--
-- Both pages used to pull every episode row just to sum runtime_minutes in JS:
-- thousands of rows for long anime, silently cut at PostgREST max_rows (1000),
-- and an .in() list of ids in the GET URL that breaks on big libraries.
-- SECURITY INVOKER: RLS applies to callers; the profile page calls it with the
-- service client to read a public library, as it already does for media_items.
CREATE OR REPLACE FUNCTION public.get_watched_minutes(item_ids uuid[])
RETURNS TABLE (media_item_id uuid, minutes integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT s.media_item_id, COALESCE(SUM(e.runtime_minutes), 0)::integer AS minutes
  FROM public.seasons s
  JOIN public.episodes e ON e.season_id = s.id
  WHERE s.media_item_id = ANY(item_ids) AND e.is_watched
  GROUP BY s.media_item_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_watched_minutes(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_watched_minutes(uuid[]) TO authenticated, service_role;

-- 3. «Продолжить просмотр» in one query.
--
-- getContinueWatching made 2 queries per "watching" title (next unwatched episode
-- + last watch time). Same rules: started titles (at least one watched episode
-- with a date) that still have an unwatched episode, freshest first.
CREATE OR REPLACE FUNCTION public.get_continue_watching(p_user_id uuid)
RETURNS TABLE (
  media_item_id uuid,
  title text,
  poster_url text,
  type text,
  next_episode_id uuid,
  episode_number integer,
  episode_name text,
  is_filler boolean,
  season_number integer,
  last_watched_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    m.id, m.title, m.poster_url, m.type,
    n.id, n.episode_number, n.name, n.is_filler, n.season_number,
    l.last_watched_at
  FROM public.media_items m
  CROSS JOIN LATERAL (
    SELECT MAX(e.watched_at) AS last_watched_at
    FROM public.seasons s
    JOIN public.episodes e ON e.season_id = s.id
    WHERE s.media_item_id = m.id AND e.is_watched AND e.watched_at IS NOT NULL
  ) l
  CROSS JOIN LATERAL (
    SELECT e.id, e.episode_number, e.name, e.is_filler, s.season_number
    FROM public.seasons s
    JOIN public.episodes e ON e.season_id = s.id
    WHERE s.media_item_id = m.id AND NOT e.is_watched
    ORDER BY s.season_number, e.episode_number
    LIMIT 1
  ) n
  WHERE m.user_id = p_user_id
    AND m.status = 'watching'
    AND m.type <> 'movie'
    AND l.last_watched_at IS NOT NULL
  ORDER BY l.last_watched_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_continue_watching(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_continue_watching(uuid) TO authenticated;
