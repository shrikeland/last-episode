import Image from 'next/image'
import { Film } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS } from '@/types'
import type { MediaItem } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  watching: 'text-status-watching',
  completed: 'text-status-completed',
  planned: 'text-status-planned',
  dropped: 'text-status-dropped',
  on_hold: 'text-status-on-hold',
}

interface ProfileMediaCardProps {
  item: MediaItem
}

export function ProfileMediaCard({ item }: ProfileMediaCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="relative aspect-[2/3] bg-secondary">
        {item.poster_url ? (
          <Image
            src={item.poster_url}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <h3 className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.2rem]">{item.title}</h3>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {MEDIA_TYPE_LABELS[item.type]}
          </Badge>
          <span className={`text-xs font-medium ${STATUS_COLORS[item.status] ?? 'text-muted-foreground'}`}>
            {MEDIA_STATUS_LABELS[item.status]}
          </span>
        </div>

        {item.release_year != null && (
          <p className="text-xs text-muted-foreground">{item.release_year}</p>
        )}
      </div>
    </div>
  )
}