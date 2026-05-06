import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TmdbSeason, Season, Episode, SeasonWithEpisodes } from '@/types'

type Client = SupabaseClient<Database>

export async function createSeasonsAndEpisodes(
  client: Client,
  mediaItemId: string,
  seasons: TmdbSeason[]
): Promise<void> {
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
      is_watched: false,
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

  if (error) throw error
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
