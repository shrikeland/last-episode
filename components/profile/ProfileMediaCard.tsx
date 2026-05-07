import Image from 'next/image'
import Link from 'next/link'
import { Film } from 'lucide-react'
import { MEDIA_STATUS_LABELS } from '@/types'
import type { MediaItem } from '@/types'

const STATUS_HEX: Record<string, string> = {
  watching:  '#4A9EFF',
  completed: '#3DDE7A',
  planned:   '#8899AA',
  dropped:   '#EF5555',
  on_hold:   '#F5C842',
}

const TYPE_LABELS_SHORT: Record<string, string> = {
  anime:     'Аниме',
  movie:     'Фильм',
  tv:        'Сериал',
  animation: 'Мульт',
}

interface ProfileMediaCardProps {
  item: MediaItem
  username: string
}

export function ProfileMediaCard({ item, username }: ProfileMediaCardProps) {
  const statusColor = STATUS_HEX[item.status] ?? '#8899AA'

  return (
    <div
      style={{
        position: 'relative',
        background: 'hsl(213 50% 11%)',
        border: '1px solid hsl(213 44% 16%)',
        borderRadius: 10,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Left vertical status bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: statusColor,
          borderRadius: '10px 0 0 10px',
          opacity: 0.5,
          zIndex: 5,
        }}
      />

      {/* Poster */}
      <Link
        href={`/profile/${encodeURIComponent(username)}/media/${item.id}`}
        className="block focus:outline-none focus:ring-2 focus:ring-primary/60"
        aria-label={`Открыть ${item.title}`}
      >
        <div
          style={{
            position: 'relative',
            paddingBottom: '150%',
            background: 'hsl(213 50% 8%)',
            overflow: 'hidden',
          }}
        >
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
              <Film className="h-10 w-10" style={{ color: 'hsl(210 14% 30%)' }} />
            </div>
          )}

          {/* Bottom gradient */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(0deg, hsl(213 50% 11% / 0.95) 0%, transparent 40%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </Link>

      {/* Info section — fixed height matches MediaCard */}
      <div
        style={{
          padding: '10px 12px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          height: 120,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Link
          href={`/profile/${encodeURIComponent(username)}/media/${item.id}`}
          style={{ textDecoration: 'none' }}
        >
          <h3
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              lineHeight: 1.35,
              color: 'hsl(210 100% 93%)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 4,
            }}
          >
            {item.title}
          </h3>
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'hsl(210 14% 40%)',
              background: 'hsl(213 50% 8%)',
              border: '1px solid hsl(213 44% 16%)',
              padding: '1px 5px',
              borderRadius: 4,
              alignSelf: 'flex-start',
            }}
          >
            {TYPE_LABELS_SHORT[item.type] ?? item.type}
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: statusColor }}>
            {MEDIA_STATUS_LABELS[item.status]}
          </span>
        </div>
      </div>

      {/* Bottom row: year */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          zIndex: 6,
        }}
      >
        {item.release_year != null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'hsl(210 14% 45%)',
              letterSpacing: '0.04em',
            }}
          >
            {item.release_year}
          </span>
        )}
      </div>
    </div>
  )
}
