'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { Trash2, Film, Star } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteMediaItem } from '@/app/actions/media'
import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS } from '@/types'
import type { MediaItem, EpisodeProgress } from '@/types'
import { useTheme } from '@/contexts/ThemeContext'

interface MediaCardProps {
  item: MediaItem
  index?: number
  progress?: EpisodeProgress
}

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

export function MediaCard({ item, index = 0, progress }: MediaCardProps) {
  const router = useRouter()
  const { accent } = useTheme()
  const [isDeleting, setIsDeleting] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [rot, setRot] = useState({ x: 0, y: 0 })
  const [glare, setGlare] = useState({ x: 50, y: 50, o: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number | null>(null)

  const statusColor = STATUS_HEX[item.status] ?? '#8899AA'

  const showProgress = (progress?.total ?? 0) > 0
  const progressPct = showProgress
    ? Math.round((progress!.watched / progress!.total) * 100)
    : 0

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(() => {
      const el = cardRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = (e.clientX - r.left) / r.width - 0.5
      const cy = (e.clientY - r.top) / r.height - 0.5
      setRot({ x: cy * -10, y: cx * 10 })
      setGlare({
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
        o: 0.12,
      })
    })
  }, [])

  const onLeave = useCallback(() => {
    setRot({ x: 0, y: 0 })
    setGlare({ x: 50, y: 50, o: 0 })
    setHovered(false)
  }, [])

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteMediaItem(item.id)
    if (result.error) {
      toast.error(result.error)
      setIsDeleting(false)
    } else {
      toast.success('Удалено из коллекции')
      router.refresh()
    }
  }

  return (
    <div
      ref={cardRef}
      data-testid={`media-card-${item.id}`}
      style={{
        position: 'relative',
        background: 'hsl(213 50% 11%)',
        border: `1px solid ${hovered ? `${statusColor}44` : 'hsl(213 44% 16%)'}`,
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        animation: `cardIn 480ms ${index * 42}ms both cubic-bezier(0.34,1.56,0.64,1)`,
        transform: `perspective(900px) rotateX(${rot.x}deg) rotateY(${rot.y}deg) scale(${hovered ? 1.02 : 1})`,
        transition: hovered
          ? 'box-shadow 0.15s, border-color 0.15s'
          : 'transform 480ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s, border-color 0.4s',
        boxShadow: hovered
          ? `0 20px 50px -12px ${statusColor}30, 0 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)`
          : '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
    >
      {/* Status left bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: statusColor,
          borderRadius: '10px 0 0 10px',
          opacity: hovered ? 1 : 0.5,
          transition: 'opacity 0.3s, box-shadow 0.3s',
          boxShadow: hovered ? `0 0 10px ${statusColor}` : 'none',
          zIndex: 5,
        }}
      />

      {/* Poster */}
      <Link href={`/media/${item.id}`} className="block">
        <div
          style={{
            position: 'relative',
            paddingBottom: '150%',
            background: 'hsl(213 50% 8%)',
            transform: hovered ? `translate(${rot.y * 0.22}px, ${rot.x * -0.22}px)` : 'none',
            transition: hovered ? 'none' : 'transform 480ms cubic-bezier(0.34,1.56,0.64,1)',
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

          {/* Bottom gradient fade */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(0deg, hsl(213 50% 11% / 0.95) 0%, transparent 40%)',
              pointerEvents: 'none',
            }}
          />

          {/* Rating badge */}
          {item.rating != null && (
            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: 8,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                border: `1px solid ${accent}40`,
                color: accent,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: 5,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                zIndex: 3,
              }}
            >
              <Star className="h-2.5 w-2.5 fill-current" />
              {item.rating}
            </div>
          )}
        </div>
      </Link>

      {/* Delete button */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'scale(1)' : 'scale(0.65)',
          transition: 'opacity 0.2s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: `0 2px 12px ${accent}80`,
          zIndex: 10,
        }}
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="flex items-center justify-center w-full h-full"
              disabled={isDeleting}
              onClick={e => e.stopPropagation()}
              aria-label="Удалить"
            >
              <Trash2 className="h-3.5 w-3.5 text-white" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить из коллекции?</AlertDialogTitle>
              <AlertDialogDescription>
                «{item.title}» будет удалён вместе с прогрессом просмотра. Это действие необратимо.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Info section */}
      <div style={{ padding: '10px 12px 30px', display: 'flex', flexDirection: 'column', gap: 6, height: 120, overflow: 'hidden', flexShrink: 0 }}>
        <Link href={`/media/${item.id}`} style={{ textDecoration: 'none' }}>
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
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = accent)}
            onMouseLeave={e => (e.currentTarget.style.color = 'hsl(210 100% 93%)')}
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

      {/* Bottom info row: year (left) + episode count (right) */}
      <div
        style={{
          position: 'absolute',
          bottom: showProgress ? 10 : 8,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 6,
        }}
      >
        {item.release_year != null ? (
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
        ) : <span />}

        {showProgress && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'hsl(210 14% 45%)',
              letterSpacing: '0.03em',
            }}
          >
            {progress!.watched}/{progress!.total} эп.
          </span>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'hsl(213 44% 16%)',
            zIndex: 6,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: statusColor,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}

      {/* Glare overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 10,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.o}) 0%, transparent 50%)`,
          pointerEvents: 'none',
          zIndex: 20,
          mixBlendMode: 'overlay',
          transition: hovered ? 'none' : 'opacity 0.4s',
        }}
      />
    </div>
  )
}