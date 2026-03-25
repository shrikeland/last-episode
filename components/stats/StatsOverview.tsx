import { Clock } from 'lucide-react'
import type { WatchStats } from '@/types'
import { MEDIA_TYPE_LABELS } from '@/types'

interface StatsOverviewProps {
  stats: WatchStats
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const typeEntries = (
    ['movie', 'animation', 'tv', 'anime'] as const
  ).map((type) => ({
    type,
    label: MEDIA_TYPE_LABELS[type],
    count: stats.byType[type].count,
    minutes: stats.byType[type].minutes,
  }))

  return (
    <div className="space-y-6">
      {/* Total time */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Общее время просмотра
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight">
          {stats.formattedTime}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {stats.totalMinutes > 0
            ? `${stats.totalMinutes} минут суммарно`
            : 'Начните смотреть, чтобы увидеть статистику'}
        </p>
      </div>

      {/* By type */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {typeEntries.map(({ type, label, count, minutes }) => (
          <div
            key={type}
            className="rounded-xl border border-border/50 bg-card p-4 space-y-1"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold">{count}</p>
            {minutes > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round(minutes / 60)} ч
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}