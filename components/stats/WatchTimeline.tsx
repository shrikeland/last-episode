import Image from 'next/image'
import Link from 'next/link'
import { Film } from 'lucide-react'
import { pluralize } from '@/lib/stats'
import type { WatchTimeline as WatchTimelineData, WatchTimelineEntry } from '@/types'

interface WatchTimelineProps {
  timeline: WatchTimelineData
  days: number
}

function episodeWord(n: number): string {
  return pluralize(n, 'серия', 'серии', 'серий')
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`
  return `${Math.round(minutes / 60)} ч`
}

function entrySubtitle(entry: WatchTimelineEntry): string {
  if (entry.episodeNumber !== null) {
    return `S${entry.seasons[0]} · Серия ${entry.episodeNumber}`
  }
  const count = `${entry.episodeCount} ${episodeWord(entry.episodeCount)}`
  if (entry.seasons.length === 1) return `S${entry.seasons[0]} · ${count}`
  return `Весь тайтл · ${count}`
}

export function WatchTimeline({ timeline, days }: WatchTimelineProps) {
  const { totalEpisodes, totalMinutes } = timeline

  return (
    <div
      className="rounded-xl border border-border/50 bg-card p-6 space-y-4"
      data-testid="watch-timeline"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Лента просмотра
        </h3>
        {totalEpisodes > 0 && (
          <p className="text-sm text-muted-foreground" data-testid="watch-timeline-summary">
            за {days} дней: {totalEpisodes} {episodeWord(totalEpisodes)}
            {totalMinutes > 0 && `, ${formatHours(totalMinutes)}`}
          </p>
        )}
      </div>

      {timeline.days.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          За последние {days} дней отметок нет
        </p>
      ) : (
        <div className="space-y-5">
          {timeline.days.map((day) => (
            <section key={day.dateKey} className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {day.label}
              </h4>
              <ul className="space-y-1">
                {day.entries.map((entry) => (
                  <li key={entry.key}>
                    <Link
                      href={`/media/${entry.media_item_id}`}
                      className="flex items-center gap-3 rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-border/30"
                    >
                      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded border border-border/50 bg-muted">
                        {entry.poster_url ? (
                          <Image
                            src={entry.poster_url}
                            alt={entry.title}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Film className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{entry.title}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {entrySubtitle(entry)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
