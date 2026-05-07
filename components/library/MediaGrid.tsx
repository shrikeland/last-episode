import { MediaCard } from './MediaCard'
import { EmptyState } from './EmptyState'
import type { MediaItem, EpisodeProgress } from '@/types'

interface MediaGridProps {
  items: MediaItem[]
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
        <MediaCard key={item.id} item={item} index={i} progress={progressMap[item.id]} />
      ))}
    </div>
  )
}
