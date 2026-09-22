import type {
  WatchHistoryRow,
  WatchTimeline,
  WatchTimelineDay,
  WatchTimelineEntry,
} from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

function createFormatters(timeZone: string) {
  return {
    // en-CA formats as YYYY-MM-DD — a sortable, timezone-aware day key
    key: new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
    dayMonth: new Intl.DateTimeFormat('ru-RU', { timeZone, day: 'numeric', month: 'long' }),
    weekday: new Intl.DateTimeFormat('ru-RU', { timeZone, weekday: 'short' }),
  }
}

/**
 * Groups watched episodes (sorted by watched_at desc) into days in the given timezone.
 * Episodes of one title sharing the exact same watched_at come from a bulk mark
 * (markSeasonWatched / markAllEpisodesWatched) and are collapsed into a single entry.
 */
export function groupWatchHistory(
  rows: WatchHistoryRow[],
  timeZone: string,
  now: Date = new Date()
): WatchTimeline {
  const fmt = createFormatters(timeZone)
  const todayKey = fmt.key.format(now)
  const yesterdayKey = fmt.key.format(new Date(now.getTime() - DAY_MS))

  const days = new Map<string, { date: Date; batches: Map<string, WatchHistoryRow[]> }>()
  let totalMinutes = 0

  for (const row of rows) {
    totalMinutes += row.runtime_minutes ?? 0

    const date = new Date(row.watched_at)
    const dateKey = fmt.key.format(date)
    let day = days.get(dateKey)
    if (!day) {
      day = { date, batches: new Map() }
      days.set(dateKey, day)
    }

    const batchKey = `${row.media_item_id}|${row.watched_at}`
    const batch = day.batches.get(batchKey)
    if (batch) batch.push(row)
    else day.batches.set(batchKey, [row])
  }

  const result: WatchTimelineDay[] = []
  for (const [dateKey, { date, batches }] of days) {
    const label =
      dateKey === todayKey
        ? 'Сегодня'
        : dateKey === yesterdayKey
          ? 'Вчера'
          : `${fmt.dayMonth.format(date)}, ${fmt.weekday.format(date)}`

    const entries: WatchTimelineEntry[] = []
    for (const [key, batchRows] of batches) {
      const first = batchRows[0]
      const seasons = Array.from(new Set(batchRows.map((r) => r.season_number))).sort(
        (a, b) => a - b
      )
      entries.push({
        key,
        media_item_id: first.media_item_id,
        title: first.title,
        poster_url: first.poster_url,
        seasons,
        episodeNumber: batchRows.length === 1 ? first.episode_number : null,
        episodeCount: batchRows.length,
      })
    }

    result.push({ dateKey, label, entries })
  }

  return { days: result, totalEpisodes: rows.length, totalMinutes }
}
