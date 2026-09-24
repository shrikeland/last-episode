import Link from 'next/link'
import type { WatchStats } from '@/types'
import { capitalizeGenre } from '@/lib/genres'

interface GenreTopListProps {
  topGenres: WatchStats['topGenres']
  /** Строки ведут в библиотеку с фильтром по жанру. Только для своей статистики — на чужом профиле ссылка в мою библиотеку обманывает */
  linkable?: boolean
}

export function GenreTopList({ topGenres, linkable = false }: GenreTopListProps) {
  const max = topGenres[0]?.count ?? 1

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Топ жанры
      </h3>

      {topGenres.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет данных</p>
      ) : (
        <div className="space-y-3">
          {topGenres.map(({ genre, count }, index) => {
            const content = (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums w-4">
                      {index + 1}
                    </span>
                    <span className="text-sm">{capitalizeGenre(genre)}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </>
            )

            return linkable ? (
              <Link
                key={genre}
                href={`/library?genre=${encodeURIComponent(genre)}`}
                className="block space-y-1 rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="stats-genre-link"
              >
                {content}
              </Link>
            ) : (
              <div key={genre} className="space-y-1">
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
