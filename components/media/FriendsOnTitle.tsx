import Link from 'next/link'
import { ChevronRight, Star } from 'lucide-react'
import type { FriendTitleEntry } from '@/lib/supabase/friends'
import type { MediaStatus } from '@/types'

// MEDIA_STATUS_LABELS написаны от первого лица («Смотрю»), здесь — про друга
const FRIEND_STATUS_LABELS: Record<MediaStatus, string> = {
  completed: 'Просмотрено',
  watching: 'Смотрит',
  on_hold: 'Отложено',
  dropped: 'Брошено',
  planned: 'Хочет посмотреть',
}

const STATUS_COLORS: Record<MediaStatus, string> = {
  watching: 'text-blue-400',
  completed: 'text-green-400',
  planned: 'text-muted-foreground',
  dropped: 'text-red-400',
  on_hold: 'text-yellow-400',
}

function formatStatus({ status, lastEpisode }: FriendTitleEntry): string {
  const label = FRIEND_STATUS_LABELS[status]
  if (!lastEpisode) return label
  const episode = `S${lastEpisode.season}E${lastEpisode.episode}`
  return status === 'dropped' ? `${label} на ${episode}` : `${label}, ${episode}`
}

function formatRating(rating: number): string {
  return Number.isInteger(rating) ? rating.toFixed(0) : rating.toFixed(1)
}

interface FriendsOnTitleProps {
  entries: FriendTitleEntry[]
}

export function FriendsOnTitle({ entries }: FriendsOnTitleProps) {
  if (entries.length === 0) return null

  return (
    <section className="space-y-3" aria-labelledby="friends-on-title-heading">
      <h2
        id="friends-on-title-heading"
        className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
      >
        У друзей
      </h2>
      <ul className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/50 bg-card/35">
        {entries.map((entry) => (
          <li key={entry.mediaItemId}>
            <Link
              href={`/profile/${encodeURIComponent(entry.username)}/media/${entry.mediaItemId}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
            >
              <span className="min-w-0 truncate font-medium">@{entry.username}</span>
              <span className={`min-w-0 flex-1 truncate text-xs ${STATUS_COLORS[entry.status]}`}>
                {formatStatus(entry)}
              </span>
              {entry.rating != null && (
                <span
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                  aria-label={`Оценка ${formatRating(entry.rating)} из 10`}
                >
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
                  {formatRating(entry.rating)}
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
