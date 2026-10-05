import { MediaCard } from './MediaCard'
import { EmptyState } from './EmptyState'
import type { LibraryCardItem, EpisodeProgress } from '@/types'

// Первая строка сетки на десктопе (5 колонок) с запасом
const PRELOAD_COUNT = 6

interface MediaGridProps {
  items: LibraryCardItem[]
  hasFilters: boolean
  progressMap: Record<string, EpisodeProgress>
}

export function MediaGrid({ items, hasFilters, progressMap }: MediaGridProps) {
  if (items.length === 0) {
    return <EmptyState hasFilters={hasFilters} />
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item, i) => (
        <MediaCard
          key={item.id}
          item={item}
          index={i}
          progress={progressMap[item.id]}
          preload={i < PRELOAD_COUNT}
        />
      ))}
    </div>
  )
}
