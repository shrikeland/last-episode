import { createServerClient } from '@/lib/supabase/server'
import { getMediaItems } from '@/lib/supabase/media'
import { computeStats } from '@/lib/stats'
import type { EpisodeForStats } from '@/lib/stats'
import { StatsOverview } from '@/components/stats/StatsOverview'
import { StatsBreakdown } from '@/components/stats/StatsBreakdown'
import { GenreTopList } from '@/components/stats/GenreTopList'
import type { MediaType } from '@/types'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const mediaItems = await getMediaItems(supabase, user.id)

  const tvAnimeIds = mediaItems
    .filter((i) => i.type !== 'movie' && i.type !== 'animation')
    .map((i) => i.id)

  let watchedEpisodes: EpisodeForStats[] = []

  if (tvAnimeIds.length > 0) {
    const { data: seasons } = await supabase
      .from('seasons')
      .select('id, media_item_id')
      .in('media_item_id', tvAnimeIds)

    if (seasons && seasons.length > 0) {
      const seasonIds = (seasons as { id: string; media_item_id: string }[]).map(
        (s) => s.id
      )
      const mediaItemTypeMap = new Map<string, MediaType>(
        mediaItems.map((i) => [i.id, i.type])
      )
      const seasonToMediaItem = new Map<string, string>(
        (seasons as { id: string; media_item_id: string }[]).map((s) => [
          s.id,
          s.media_item_id,
        ])
      )

      const { data: episodes } = await supabase
        .from('episodes')
        .select('runtime_minutes, season_id')
        .eq('is_watched', true)
        .in('season_id', seasonIds)

      if (episodes) {
        watchedEpisodes = (
          episodes as { runtime_minutes: number | null; season_id: string }[]
        ).map((ep) => ({
          runtime_minutes: ep.runtime_minutes,
          media_type:
            mediaItemTypeMap.get(
              seasonToMediaItem.get(ep.season_id) ?? ''
            ) ?? 'tv',
        }))
      }
    }
  }

  const stats = computeStats(mediaItems, watchedEpisodes)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Статистика</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Сводка по вашей коллекции
        </p>
      </div>

      <StatsOverview stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsBreakdown stats={stats} />
        <GenreTopList topGenres={stats.topGenres} />
      </div>
    </div>
  )
}