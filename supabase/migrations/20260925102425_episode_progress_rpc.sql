-- Library episode progress, counted in the database.
--
-- getEpisodeProgressMap used to pull one row per watched episode just to count
-- them in JS; PostgREST caps responses at max_rows (1000), so big libraries got
-- silently truncated counts. This returns one row per title instead.
--
-- SECURITY INVOKER: RLS on seasons/episodes still applies, a caller only sees
-- progress for their own titles.
CREATE OR REPLACE FUNCTION public.get_episode_progress(item_ids uuid[])
RETURNS TABLE (media_item_id uuid, watched integer, total integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    s.media_item_id,
    COALESCE(SUM(w.cnt), 0)::integer AS watched,
    SUM(s.episode_count)::integer AS total
  FROM public.seasons s
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.episodes e
    WHERE e.season_id = s.id AND e.is_watched
  ) w ON true
  WHERE s.media_item_id = ANY(item_ids)
  GROUP BY s.media_item_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_episode_progress(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_episode_progress(uuid[]) TO authenticated;

-- getPendingCount runs in the (app) layout on every navigation and filters by
-- friend_id; only user_id was indexed.
CREATE INDEX IF NOT EXISTS friendships_friend_id_idx ON public.friendships (friend_id);
