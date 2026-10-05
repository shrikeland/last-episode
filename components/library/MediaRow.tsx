import { MediaCard } from './MediaCard'
import { ScrollRow } from './ScrollRow'
import type { LibraryCardItem, EpisodeProgress } from '@/types'

interface MediaRowProps {
  items: LibraryCardItem[]
  progressMap: Record<string, EpisodeProgress>
  /** Сколько первых постеров грузить сразу (см. MediaCard.preload). */
  preloadCount?: number
}

export function MediaRow({ items, progressMap, preloadCount = 0 }: MediaRowProps) {
  return (
    <ScrollRow>
      {items.map((item, i) => (
        <div key={item.id} className="flex-shrink-0 w-[140px] sm:w-[152px]">
          <MediaCard item={item} index={i} progress={progressMap[item.id]} preload={i < preloadCount} />
        </div>
      ))}
    </ScrollRow>
  )
}
