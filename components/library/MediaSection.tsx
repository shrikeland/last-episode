import { MediaRow } from './MediaRow'
import { MEDIA_TYPE_LABELS } from '@/types'
import type { MediaItem, MediaType } from '@/types'

const SECTION_ICONS: Record<MediaType, string> = {
  movie: '🎬',
  animation: '🎨',
  tv: '📺',
  anime: '⛩️',
}

interface MediaSectionProps {
  type: MediaType
  items: MediaItem[]
}

export function MediaSection({ type, items }: MediaSectionProps) {
  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl" role="img" aria-hidden>{SECTION_ICONS[type]}</span>
        <h2 className="text-lg font-semibold tracking-tight">{MEDIA_TYPE_LABELS[type]}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <MediaRow items={items} />
    </div>
  )
}
