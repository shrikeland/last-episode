import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ContinueItem,
  Database,
  Episode,
  MediaItem,
  NextEpisode,
  Season,
  SeasonWithEpisodes,
  TmdbSeason,
  WatchHistoryRow,
} from '@/types'

type Client = SupabaseClient<Database>

async function isCompletedMediaItem(client: Client, mediaItemId: string): Promise<boolean> {
  const { data, error } = await client
    .from('media_items')
    .select('status')
    .eq('id', mediaItemId)
    .single()

  if (error) throw error
  return (data as { status: string } | null)?.status === 'completed'
}

export async function syncSeasonsAndEpisodes(
  client: Client,
  mediaItemId: string,
  seasons: TmdbSeason[]
): Promise<void> {
  // watched_at stays null: the real watch date is unknown, and a sync-time stamp
  // would pile every episode onto one day in the /stats watch timeline.
  const markNewEpisodesWatched = await isCompletedMediaItem(client, mediaItemId)

  for (const season of seasons) {
    const { data: seasonData, error: seasonError } = await client
      .from('seasons')
      .upsert(
        {
          media_item_id: mediaItemId,
          tmdb_season_id: season.tmdb_season_id,
          season_number: season.season_number,
          name: season.name,
          episode_count: season.episode_count,
        },
        { onConflict: 'media_item_id,season_number' }
      )
      .select('id')
      .single()

    if (seasonError) throw seasonError
    if (!seasonData || season.episodes.length === 0) continue

    const episodesByNumber = new Map(
      season.episodes.map((episode) => [episode.episode_number, episode])
    )
    const episodes = Array.from(episodesByNumber.values())

    const { data: existingEpisodes, error: existingEpisodesError } = await client
      .from('episodes')
      .select('id, episode_number')
      .eq('season_id', seasonData.id)
      .in(
        'episode_number',
        episodes.map((episode) => episode.episode_number)
      )

    if (existingEpisodesError) throw existingEpisodesError

    const existingEpisodeNumbers = new Set(
      ((existingEpisodes ?? []) as { episode_number: number }[]).map(
        (episode) => episode.episode_number
      )
    )

    const newEpisodeRows = episodes
      .filter((episode) => !existingEpisodeNumbers.has(episode.episode_number))
      .map((episode) => ({
        season_id: seasonData.id,
        tmdb_episode_id: episode.tmdb_episode_id,
        episode_number: episode.episode_number,
        name: episode.name,
        runtime_minutes: episode.runtime_minutes,
        is_watched: markNewEpisodesWatched,
        watched_at: null,
      }))

    if (newEpisodeRows.length > 0) {
      const { error: insertEpisodesError } = await client
        .from('episodes')
        .insert(newEpisodeRows)

      if (insertEpisodesError) throw insertEpisodesError
    }

    for (const episode of episodes) {
      if (!existingEpisodeNumbers.has(episode.episode_number)) continue

      const { error: updateEpisodeError } = await client
        .from('episodes')
        .update({
          tmdb_episode_id: episode.tmdb_episode_id,
          name: episode.name,
          runtime_minutes: episode.runtime_minutes,
        })
        .eq('season_id', seasonData.id)
        .eq('episode_number', episode.episode_number)

      if (updateEpisodeError) throw updateEpisodeError
    }
  }
}

export async function createSeasonsAndEpisodes(
  client: Client,
  mediaItemId: string,
  seasons: TmdbSeason[]
): Promise<void> {
  // watched_at stays null — see syncSeasonsAndEpisodes
  const markEpisodesWatched = await isCompletedMediaItem(client, mediaItemId)

  for (const season of seasons) {
    const { data: seasonData, error: seasonError } = await client
      .from('seasons')
      .insert({
        media_item_id: mediaItemId,
        tmdb_season_id: season.tmdb_season_id,
        season_number: season.season_number,
        name: season.name,
        episode_count: season.episode_count,
      })
      .select('id')
      .single()

    if (seasonError || !seasonData) continue

    if (season.episodes.length === 0) continue

    const episodeRows = season.episodes.map((ep) => ({
      season_id: seasonData.id,
      tmdb_episode_id: ep.tmdb_episode_id,
      episode_number: ep.episode_number,
      name: ep.name,
      runtime_minutes: ep.runtime_minutes,
      is_watched: markEpisodesWatched,
      watched_at: null,
    }))

    await client.from('episodes').insert(episodeRows)
  }
}

export async function getSeasonsWithEpisodes(
  client: Client,
  mediaItemId: string
): Promise<SeasonWithEpisodes[]> {
  const { data: seasons, error: seasonsError } = await client
    .from('seasons')
    .select('*')
    .eq('media_item_id', mediaItemId)
    .order('season_number', { ascending: true })

  if (seasonsError || !seasons) return []

  const typedSeasons = seasons as Season[]

  const episodeResults = await Promise.all(
    typedSeasons.map((season) =>
      client
        .from('episodes')
        .select('*')
        .eq('season_id', season.id)
        .order('episode_number', { ascending: true })
    )
  )

  return typedSeasons.map((season, i) => ({
    ...season,
    episodes: episodeResults[i].error ? [] : (episodeResults[i].data as Episode[]),
  }))
}

export async function toggleEpisodeWatched(
  client: Client,
  episodeId: string,
  isWatched: boolean
): Promise<Episode | null> {
  const { data, error } = await client
    .from('episodes')
    .update({
      is_watched: isWatched,
      watched_at: isWatched ? new Date().toISOString() : null,
    })
    .eq('id', episodeId)
    .select()
    .single()

  if (error) throw error
  return data as Episode
}

export async function markSeasonWatched(
  client: Client,
  seasonId: string,
  isWatched: boolean
): Promise<void> {
  const { error } = await client
    .from('episodes')
    .update({
      is_watched: isWatched,
      watched_at: isWatched ? new Date().toISOString() : null,
    })
    .eq('season_id', seasonId)
    // Только серии, которые меняют состояние: иначе уже отмеченные получат новый watched_at
    .eq('is_watched', !isWatched)

  if (error) throw error
}

/**
 * Отмечает серии сезона до указанной включительно и, опционально, все серии предыдущих сезонов.
 * Уже отмеченные серии не трогаются, чтобы не перезаписать их watched_at.
 * Один watched_at на все апдейты — лента просмотра склеивает массовую отметку по нему.
 */
export async function markEpisodesUpTo(
  client: Client,
  episodeId: string,
  includePreviousSeasons: boolean
): Promise<void> {
  const { data: episode, error: episodeError } = await client
    .from('episodes')
    .select('episode_number, season_id, seasons!inner(season_number, media_item_id)')
    .eq('id', episodeId)
    .single()

  if (episodeError) throw episodeError

  const { episode_number, season_id, seasons: season } = episode as unknown as {
    episode_number: number
    season_id: string
    seasons: { season_number: number; media_item_id: string }
  }
  const update = { is_watched: true, watched_at: new Date().toISOString() }

  const { error } = await client
    .from('episodes')
    .update(update)
    .eq('season_id', season_id)
    .lte('episode_number', episode_number)
    .eq('is_watched', false)

  if (error) throw error
  if (!includePreviousSeasons) return

  const { data: previousSeasons, error: seasonsError } = await client
    .from('seasons')
    .select('id')
    .eq('media_item_id', season.media_item_id)
    .lt('season_number', season.season_number)

  if (seasonsError) throw seasonsError
  if (!previousSeasons || previousSeasons.length === 0) return

  const { error: previousError } = await client
    .from('episodes')
    .update(update)
    .in(
      'season_id',
      (previousSeasons as { id: string }[]).map((s) => s.id)
    )
    .eq('is_watched', false)

  if (previousError) throw previousError
}

export async function markAllEpisodesWatched(
  client: Client,
  mediaItemId: string
): Promise<void> {
  const { data: seasons, error: seasonsError } = await client
    .from('seasons')
    .select('id')
    .eq('media_item_id', mediaItemId)

  if (seasonsError || !seasons || seasons.length === 0) return

  const seasonIds = (seasons as { id: string }[]).map((s) => s.id)

  const { error } = await client
    .from('episodes')
    .update({
      is_watched: true,
      watched_at: new Date().toISOString(),
    })
    .in('season_id', seasonIds)
    // Уже отмеченные не трогаем, чтобы сохранить их watched_at
    .eq('is_watched', false)

  if (error) throw error
}

export async function hasPlannedSeasons(
  client: Client,
  mediaItemId: string
): Promise<boolean> {
  const { data: seasons, error: seasonsError } = await client
    .from('seasons')
    .select('id, episode_count')
    .eq('media_item_id', mediaItemId)

  if (seasonsError) throw seasonsError
  if (!seasons || seasons.length === 0) return false

  const seasonRows = seasons as { id: string; episode_count: number }[]
  if (seasonRows.some((season) => season.episode_count > 0) === false) {
    return seasonRows.some((season) => season.episode_count === 0)
  }

  const seasonIds = seasonRows.map((season) => season.id)
  const { data: episodeCounts, error: episodesError } = await client
    .from('episodes')
    .select('season_id')
    .in('season_id', seasonIds)

  if (episodesError) throw episodesError

  const createdBySeason = new Map<string, number>()
  for (const episode of (episodeCounts ?? []) as { season_id: string }[]) {
    createdBySeason.set(episode.season_id, (createdBySeason.get(episode.season_id) ?? 0) + 1)
  }

  return seasonRows.some((season) => {
    const createdCount = createdBySeason.get(season.id) ?? 0
    return createdCount === 0 || season.episode_count > createdCount
  })
}

export async function markAllEpisodesUnwatched(
  client: Client,
  mediaItemId: string
): Promise<void> {
  const { data: seasons, error: seasonsError } = await client
    .from('seasons')
    .select('id')
    .eq('media_item_id', mediaItemId)

  if (seasonsError || !seasons || seasons.length === 0) return

  const seasonIds = (seasons as { id: string }[]).map((s) => s.id)

  const { error } = await client
    .from('episodes')
    .update({
      is_watched: false,
      watched_at: null,
    })
    .in('season_id', seasonIds)

  if (error) throw error
}

type NextEpisodeRow = Omit<NextEpisode, 'season_number'> & {
  seasons: { season_number: number }
}

/**
 * Первая непросмотренная серия тайтла по порядку сезон → серия.
 * Один запрос с limit(1): выборка всех непросмотренных у длинного аниме упёрлась бы
 * в лимит PostgREST в 1000 строк. Сортировка по полю to-one embed — `seasons(season_number)`.
 */
export async function getNextUnwatchedEpisode(
  client: Client,
  mediaItemId: string
): Promise<NextEpisode | null> {
  const { data, error } = await client
    .from('episodes')
    .select('id, episode_number, name, is_filler, seasons!inner(season_number, media_item_id)')
    .eq('seasons.media_item_id', mediaItemId)
    .eq('is_watched', false)
    .order('seasons(season_number)')
    .order('episode_number')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // Database без Relationships — тип embed-выборки не выводится, приводим вручную
  const row = data as unknown as NextEpisodeRow
  return {
    id: row.id,
    episode_number: row.episode_number,
    name: row.name,
    is_filler: row.is_filler,
    season_number: row.seasons.season_number,
  }
}

/** Время последней отмеченной серии тайтла. updated_at тайтла не годится: отметка серии его не трогает. */
export async function getLastWatchedAt(
  client: Client,
  mediaItemId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('episodes')
    .select('watched_at, seasons!inner(media_item_id)')
    .eq('seasons.media_item_id', mediaItemId)
    .eq('is_watched', true)
    .not('watched_at', 'is', null)
    .order('watched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as unknown as { watched_at: string } | null)?.watched_at ?? null
}

/**
 * Начатые тайтлы «Смотрю» с непросмотренными сериями, свежие первыми.
 * По два запроса с limit(1) на тайтл, все параллельно — тайтлов «Смотрю» обычно единицы.
 */
export async function getContinueWatching(
  client: Client,
  userId: string
): Promise<ContinueItem[]> {
  const { data, error } = await client
    .from('media_items')
    .select('id, title, poster_url, type')
    .eq('user_id', userId)
    .eq('status', 'watching')
    .neq('type', 'movie')

  if (error) throw error
  const items = (data ?? []) as Pick<MediaItem, 'id' | 'title' | 'poster_url' | 'type'>[]

  const entries = await Promise.all(
    items.map(async (item) => {
      const [next, lastWatchedAt] = await Promise.all([
        getNextUnwatchedEpisode(client, item.id),
        getLastWatchedAt(client, item.id),
      ])
      return next && lastWatchedAt ? { item, next, lastWatchedAt } : null
    })
  )

  return entries
    .filter((e): e is ContinueItem => e !== null)
    .sort((a, b) => b.lastWatchedAt.localeCompare(a.lastWatchedAt))
}

// Safety cap: a 30-day window never realistically exceeds this, even with bulk marks
const WATCH_HISTORY_LIMIT = 1000

type WatchHistoryQueryRow = {
  id: string
  episode_number: number
  runtime_minutes: number | null
  watched_at: string
  seasons: {
    season_number: number
    media_items: { id: string; title: string; poster_url: string | null }
  }
}

export async function getRecentWatchHistory(
  client: Client,
  userId: string,
  days: number
): Promise<WatchHistoryRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // RLS already limits episodes to the owner, but the explicit user filter keeps
  // this safe if it is ever called with the service client
  const { data, error } = await client
    .from('episodes')
    .select(
      'id, episode_number, runtime_minutes, watched_at, seasons!inner(season_number, media_items!inner(id, title, poster_url))'
    )
    .eq('is_watched', true)
    .gte('watched_at', since)
    .eq('seasons.media_items.user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(WATCH_HISTORY_LIMIT)

  if (error) throw error

  return ((data ?? []) as unknown as WatchHistoryQueryRow[]).map((row) => ({
    episode_id: row.id,
    episode_number: row.episode_number,
    runtime_minutes: row.runtime_minutes,
    watched_at: row.watched_at,
    season_number: row.seasons.season_number,
    media_item_id: row.seasons.media_items.id,
    title: row.seasons.media_items.title,
    poster_url: row.seasons.media_items.poster_url,
  }))
}
