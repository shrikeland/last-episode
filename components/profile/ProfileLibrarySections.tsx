import { ProfileMediaRow } from './ProfileMediaRow'
import { MEDIA_TYPE_LABELS } from '@/types'
import type { MediaItem, MediaType } from '@/types'

const TYPE_ORDER: MediaType[] = ['movie', 'tv', 'anime']

const SECTION_ICONS: Record<MediaType, string> = {
  movie: '🎬',
  tv: '📺',
  anime: '⛩️',
}

interface ProfileLibrarySectionsProps {
  items: MediaItem[]
}

export function ProfileLibrarySections({ items }: ProfileLibrarySectionsProps) {
  const grouped = items.reduce<Record<MediaType, MediaItem[]>>(
    (acc, item) => { acc[item.type].push(item); return acc },
    { movie: [], tv: [], anime: [] }
  )

  return (
    <div className="space-y-10">
      {TYPE_ORDER.map((type) => {
        const typeItems = grouped[type]
        if (typeItems.length === 0) return null
        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-hidden>{SECTION_ICONS[type]}</span>
              <h3 className="text-base font-semibold tracking-tight">{MEDIA_TYPE_LABELS[type]}</h3>
              <span className="text-sm text-muted-foreground tabular-nums">{typeItems.length}</span>
            </div>
            <ProfileMediaRow items={typeItems} />
          </div>
        )
      })}
    </div>
  )
}