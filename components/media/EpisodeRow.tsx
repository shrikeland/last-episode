'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { Episode } from '@/types'

interface EpisodeRowProps {
  episode: Episode
  onToggle: (episodeId: string, isWatched: boolean) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export function EpisodeRow({ episode, onToggle }: EpisodeRowProps) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-1 rounded hover:bg-muted/30 transition-colors">
      <Checkbox
        checked={episode.is_watched}
        onCheckedChange={(checked) => onToggle(episode.id, checked === true)}
        data-testid={`episode-checkbox-${episode.id}`}
        aria-label={`Эпизод ${episode.episode_number}: ${episode.name}`}
      />
      <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">
        E{String(episode.episode_number).padStart(2, '0')}
      </span>
      <span className="text-sm flex-1 truncate">{episode.name}</span>
      {episode.is_filler && (
        <Badge
          variant="outline"
          className="text-xs px-1.5 py-0 shrink-0 text-amber-500/70 border-amber-500/30"
          data-testid={`episode-filler-badge-${episode.id}`}
        >
          Филлер
        </Badge>
      )}
      {episode.runtime_minutes !== null && (
        <span className="text-xs text-muted-foreground shrink-0">
          {episode.runtime_minutes} мин
        </span>
      )}
      {episode.is_watched && episode.watched_at && (
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDate(episode.watched_at)}
        </span>
      )}
    </div>
  )
}