import { MediaCard } from './MediaCard'
import { ScrollRow } from './ScrollRow'
import type { LibraryCardItem, EpisodeProgress } from '@/types'

interface MediaRowProps {
  items: LibraryCardItem[]
  progressMap: Record<string, EpisodeProgress>
}

export function MediaRow({ items, progressMap }: MediaRowProps) {
  return (
    <ScrollRow>
      {items.map((item, i) => (
        <div key={item.id} className="flex-shrink-0 w-[140px] sm:w-[152px]">
          <MediaCard item={item} index={i} progress={progressMap[item.id]} />
        </div>
      ))}
    </ScrollRow>
  )
}
