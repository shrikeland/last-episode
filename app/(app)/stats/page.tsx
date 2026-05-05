import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { getMediaItems } from '@/lib/supabase/media'
import { computeStats } from '@/lib/stats'
import type { EpisodeForStats } from '@/lib/stats'
import { StatsOverview } from '@/components/stats/StatsOverview'
import { StatsBreakdown } from '@/components/stats/StatsBreakdown'
import { GenreTopList } from '@/components/stats/GenreTopList'
import type { MediaType } from '@/types'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const user = await getServerUser()
  if (!user) return null

  const supabase = await createServerClient()

  const mediaItems = await getMediaItems(supabase, user.id)

  const tvAnimeIds = mediaItems
    .filter((i) => i.type !== 'movie' && i.type !== 'animation')
    .map((i) => i.id)

  let watchedEpisodes: EpisodeForStats[] = []

  if (tvAnimeIds.length > 0) {
    type SeasonWithEpisodes = {
      media_item_id: string
      episodes: { runtime_minutes: number | null; is_watched: boolean }[]
    }

    const { data: seasons } = await supabase
      .from('seasons')
      .select('media_item_id, episodes(runtime_minutes, is_watched)')
      .in('media_item_id', tvAnimeIds)

    if (seasons && seasons.length > 0) {
      const mediaItemTypeMap = new Map<string, MediaType>(
        mediaItems.map((i) => [i.id, i.type])
      )

      for (const season of seasons as SeasonWithEpisodes[]) {
        const mediaType = mediaItemTypeMap.get(season.media_item_id) ?? 'tv'
        for (const ep of season.episodes) {
          if (ep.is_watched) {
            watchedEpisodes.push({
              runtime_minutes: ep.runtime_minutes,
              media_type: mediaType,
            })
          }
        }
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