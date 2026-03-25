import { MediaSection } from './MediaSection'
import { MediaGrid } from './MediaGrid'
import { EmptyState } from './EmptyState'
import type { MediaItem, MediaType } from '@/types'

const TYPE_ORDER: MediaType[] = ['movie', 'animation', 'tv', 'anime']

interface LibrarySectionsProps {
  items: MediaItem[]
  hasFilters: boolean
}

export function LibrarySections({ items, hasFilters }: LibrarySectionsProps) {
  if (hasFilters) {
    return <MediaGrid items={items} hasFilters={hasFilters} />
  }

  if (items.length === 0) {
    return <EmptyState hasFilters={false} />
  }

  const grouped = items.reduce<Record<MediaType, MediaItem[]>>(
    (acc, item) => { acc[item.type].push(item); return acc },
    { movie: [], animation: [], tv: [], anime: [] }
  )

  return (
    <div className="space-y-10">
      {TYPE_ORDER.map((type) => (
        <MediaSection key={type} type={type} items={grouped[type]} />
      ))}
    </div>
  )
}