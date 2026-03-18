import { createServiceClient } from '@/lib/supabase/service'
import { searchAniList } from './anilist'
import { getFillerEpisodeNumbers } from './jikan'
import type { TmdbSeason } from '@/types'

/**
 * Fire-and-forget: fetch filler data and apply to user's episodes.
 * Called after createSeasonsAndEpisodes for anime type.
 * Never throws — all errors are caught and logged.
 */
export async function fetchAndApplyFillers(
  mediaItemId: string,
  tmdbId: number,
  title: string,
  originalTitle: string,
  seasons: TmdbSeason[]
): Promise<void> {
  try {
    const supabaseAdmin = createServiceClient()

    // 1. Check cache
    const { data: cached } = await supabaseAdmin
      .from('anime_filler_cache')
      .select('status')
      .eq('tmdb_id', tmdbId)
      .maybeSingle()

    if (cached?.status === 'fetched') {
      // Filler data already in DB — apply to this user's episodes
      await applyFillersToDB(supabaseAdmin, mediaItemId, tmdbId, seasons)
      return
    }

    if (cached?.status === 'not_found') {
      return
    }

    // 2. Resolve MAL ID via AniList
    // Try primary title first, then original_title as fallback
    let anilistMatch = await searchAniList(title)
    if (!anilistMatch && originalTitle && originalTitle !== title) {
      anilistMatch = await searchAniList(originalTitle)
    }

    if (!anilistMatch) {
      await supabaseAdmin.from('anime_filler_cache').upsert({
        tmdb_id: tmdbId,
        status: 'not_found',
        source_url: null,
        fetched_at: new Date().toISOString(),
      })
      return
    }

    // 3. Fetch filler episodes from Jikan
    const fillerNumbers = await getFillerEpisodeNumbers(anilistMatch.malId)

    const sourceUrl = `https://myanimelist.net/anime/${anilistMatch.malId}`

    if (fillerNumbers.length === 0) {
      // Anime has no fillers (or episode data unavailable)
      await supabaseAdmin.from('anime_filler_cache').upsert({
        tmdb_id: tmdbId,
        status: 'fetched',
        source_url: sourceUrl,
        fetched_at: new Date().toISOString(),
      })
      return
    }

    // 4. Insert into global filler_episodes cache
    const fillerRows = fillerNumbers.map((epNum) => ({
      tmdb_id: tmdbId,
      absolute_episode_number: epNum,
    }))

    await supabaseAdmin
      .from('filler_episodes')
      .upsert(fillerRows, { onConflict: 'tmdb_id,absolute_episode_number' })

    // 5. Update cache status
    await supabaseAdmin.from('anime_filler_cache').upsert({
      tmdb_id: tmdbId,
      status: 'fetched',
      source_url: sourceUrl,
      fetched_at: new Date().toISOString(),
    })

    // 6. Apply fillers to this user's episodes
    await applyFillersToDB(supabaseAdmin, mediaItemId, tmdbId, seasons)
  } catch (err) {
    console.error('[filler] fetchAndApplyFillers error:', err)
    // Don't re-throw — this is fire-and-forget
  }
}

/**
 * Mark is_filler = true on user's episodes using cached filler_episodes data.
 * Uses absolute episode numbering to match Jikan's flat episode sequence.
 */
async function applyFillersToDB(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  mediaItemId: string,
  tmdbId: number,
  seasons: TmdbSeason[]
): Promise<void> {
  // Load filler numbers from global cache
  const { data: fillerRows } = await supabaseAdmin
    .from('filler_episodes')
    .select('absolute_episode_number')
    .eq('tmdb_id', tmdbId)

  if (!fillerRows || fillerRows.length === 0) return

  const fillerSet = new Set<number>(
    (fillerRows as { absolute_episode_number: number }[]).map(
      (r) => r.absolute_episode_number
    )
  )

  // Load user's episode IDs from DB, ordered by season + episode number
  const { data: seasonRows } = await supabaseAdmin
    .from('seasons')
    .select('id, season_number, episode_count')
    .eq('media_item_id', mediaItemId)
    .order('season_number', { ascending: true })

  if (!seasonRows || seasonRows.length === 0) return

  const seasonIds = (seasonRows as { id: string }[]).map((s) => s.id)

  const { data: episodeRows } = await supabaseAdmin
    .from('episodes')
    .select('id, season_id, episode_number')
    .in('season_id', seasonIds)
    .order('episode_number', { ascending: true })

  if (!episodeRows || episodeRows.length === 0) return

  // Build season_id → absolute offset map
  type SeasonRow = { id: string; season_number: number; episode_count: number }
  const sortedSeasons = (seasonRows as SeasonRow[]).sort(
    (a, b) => a.season_number - b.season_number
  )

  const offsetMap = new Map<string, number>()
  let offset = 0
  for (const s of sortedSeasons) {
    offsetMap.set(s.id, offset)
    offset += s.episode_count
  }

  // Find episode IDs that are fillers
  type EpisodeRow = { id: string; season_id: string; episode_number: number }
  const fillerEpisodeIds: string[] = []

  for (const ep of episodeRows as EpisodeRow[]) {
    const seasonOffset = offsetMap.get(ep.season_id) ?? 0
    const absoluteNum = seasonOffset + ep.episode_number
    if (fillerSet.has(absoluteNum)) {
      fillerEpisodeIds.push(ep.id)
    }
  }

  if (fillerEpisodeIds.length === 0) return

  await supabaseAdmin
    .from('episodes')
    .update({ is_filler: true })
    .in('id', fillerEpisodeIds)
}
