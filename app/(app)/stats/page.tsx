import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { getMediaItems } from '@/lib/supabase/media'
import { getRecentWatchHistory, getWatchedMinutes } from '@/lib/supabase/progress'
import { computeStats } from '@/lib/stats'
import type { EpisodeForStats } from '@/lib/stats'
import { groupWatchHistory } from '@/lib/timeline'
import { WATCH_TIMELINE_DAYS, WATCH_TIMEZONE } from '@/lib/constants'
import { StatsOverview } from '@/components/stats/StatsOverview'
import { StatsBreakdown } from '@/components/stats/StatsBreakdown'
import { GenreTopList } from '@/components/stats/GenreTopList'
import { WatchTimeline } from '@/components/stats/WatchTimeline'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const user = await getServerUser()
  if (!user) return null

  const supabase = await createServerClient()

  const [mediaItems, watchHistory] = await Promise.all([
    getMediaItems(supabase, user.id),
    // Timeline is secondary — a failed query must not take down the whole stats page
    getRecentWatchHistory(supabase, user.id, WATCH_TIMELINE_DAYS).catch((error) => {
      console.error('Failed to load watch history', error)
      return []
    }),
  ])
  const timeline = groupWatchHistory(watchHistory, WATCH_TIMEZONE)

  // Минуты сериалов и аниме считает БД: раньше сюда приезжала каждая серия библиотеки
  const tvAnimeItems = mediaItems.filter((i) => i.type !== 'movie' && i.type !== 'animation')
  const minutesByItem = await getWatchedMinutes(
    supabase,
    tvAnimeItems.map((i) => i.id)
  )
  // computeStats суммирует runtime_minutes по типу — одна запись на тайтл даёт ту же сумму
  const watchedEpisodes: EpisodeForStats[] = tvAnimeItems.map((i) => ({
    runtime_minutes: minutesByItem.get(i.id) ?? 0,
    media_type: i.type,
  }))

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
        <StatsBreakdown stats={stats} linkable />
        <GenreTopList topGenres={stats.topGenres} linkable />
      </div>

      <WatchTimeline timeline={timeline} days={WATCH_TIMELINE_DAYS} />
    </div>
  )
}