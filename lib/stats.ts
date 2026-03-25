import type { MediaItem, WatchStats } from '@/types'

export interface EpisodeForStats {
  runtime_minutes: number | null
  media_type: 'movie' | 'animation' | 'tv' | 'anime'
}

export function computeStats(
  mediaItems: MediaItem[],
  watchedEpisodes: EpisodeForStats[]
): WatchStats {
  const byType: WatchStats['byType'] = {
    movie: { count: 0, minutes: 0 },
    animation: { count: 0, minutes: 0 },
    tv: { count: 0, minutes: 0 },
    anime: { count: 0, minutes: 0 },
  }

  for (const item of mediaItems) {
    byType[item.type].count++
    if ((item.type === 'movie' || item.type === 'animation') && item.status === 'completed') {
      byType[item.type].minutes += item.runtime_minutes ?? 0
    }
  }

  for (const ep of watchedEpisodes) {
    byType[ep.media_type].minutes += ep.runtime_minutes ?? 0
  }

  const totalMinutes = Object.values(byType).reduce((sum, t) => sum + t.minutes, 0)

  const byStatus: WatchStats['byStatus'] = {
    watching: 0,
    completed: 0,
    planned: 0,
    dropped: 0,
    on_hold: 0,
  }
  for (const item of mediaItems) {
    byStatus[item.status]++
  }

  const genreCount: Record<string, number> = {}
  for (const item of mediaItems) {
    for (const genre of item.genres) {
      genreCount[genre] = (genreCount[genre] ?? 0) + 1
    }
  }
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }))

  return {
    totalMinutes,
    formattedTime: formatDuration(totalMinutes),
    byType,
    byStatus,
    topGenres,
  }
}

export function formatDuration(totalMinutes: number): string {
  if (totalMinutes === 0) return '0 минут'
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const mins = totalMinutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days} ${pluralize(days, 'день', 'дня', 'дней')}`)
  if (hours > 0) parts.push(`${hours} ${pluralize(hours, 'час', 'часа', 'часов')}`)
  if (mins > 0) parts.push(`${mins} ${pluralize(mins, 'минута', 'минуты', 'минут')}`)
  return parts.join(' ')
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}