'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, Plus, Film, Tv, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddToLibraryDialog } from '@/components/library/AddToLibraryDialog'
import { cn } from '@/lib/utils'
import { addRecommendedTitle } from '@/app/actions/recommendations'
import { RecommendationDetailDialog } from './RecommendationDetailDialog'
import type { RecommendationCardData } from '@/types/recommendations'
import type { CreateMediaItemOptions, MediaStatus, MediaType } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  movie: 'Фильм',
  animation: 'Мультфильм',
  tv: 'Сериал',
  anime: 'Аниме',
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  movie: Film,
  animation: Film,
  tv: Tv,
  anime: Sparkles,
}

const ERROR_MESSAGES = {
  already_exists: 'Уже в вашей коллекции',
  auth: 'Войдите, чтобы добавить тайтл',
  tmdb: 'Ошибка получения данных TMDB',
  db_error: 'Ошибка сохранения',
  invalid_rating: 'Оценка должна быть от 0.5 до 10 с шагом 0.5',
  planned_seasons: 'Нельзя сразу отметить просмотренным: есть запланированные сезоны',
}

function normalizeType(type: string): MediaType {
  if (type === 'movie' || type === 'animation' || type === 'tv' || type === 'anime') return type as MediaType
  return 'movie'
}

export function RecommendationCard({ title, year, type, reason, tmdbId, posterUrl, initialAdded = false }: RecommendationCardData & { initialAdded?: boolean }) {
  const [state, setState] = useState<'idle' | 'loading' | 'added'>(initialAdded ? 'added' : 'idle')
  const [status, setStatus] = useState<MediaStatus>('planned')
  const [rating, setRating] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const TypeIcon = TYPE_ICONS[type] ?? Film
  const mediaType = normalizeType(type)

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!tmdbId || state !== 'idle') return
    setAddDialogOpen(true)
  }

  async function handleAddConfirm() {
    if (!tmdbId) return

    setState('loading')
    const options: CreateMediaItemOptions = { status, rating }
    const result = await addRecommendedTitle(tmdbId, mediaType, options)

    if (result.error === 'already_exists') {
      setState('added')
      setAddDialogOpen(false)
    } else if (result.error) {
      setState('idle')
      toast.error(ERROR_MESSAGES[result.error])
    } else {
      toast.success('Добавлено в список')
      setState('added')
      setAddDialogOpen(false)
    }
  }

  return (
    <>
      <div
        data-testid="recommendation-card"
        onClick={() => tmdbId && setDialogOpen(true)}
        className={cn(
          'group relative flex flex-col bg-card border border-border rounded-lg overflow-hidden transition-colors',
          tmdbId && 'cursor-pointer hover:border-primary/40'
        )}
      >
        {/* Poster */}
        <div className="relative aspect-[2/3] bg-secondary flex-shrink-0">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="gap-1 text-xs bg-black/60 text-white border-0 backdrop-blur-sm">
              <TypeIcon className="h-3 w-3" />
              {TYPE_LABELS[type] ?? type}
            </Badge>
          </div>

          {/* Hover overlay */}
          {tmdbId != null && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium px-2 py-1 rounded bg-black/30">
                Подробнее
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col p-3 flex-1">
          <p className="text-sm font-semibold leading-tight line-clamp-2">{title}</p>
          <p className="text-xs text-muted-foreground text-right mt-auto mb-1.5">{year ?? ''}</p>

          {tmdbId != null && (
            <Button
              data-testid="recommendation-add-button"
              variant={state === 'added' ? 'secondary' : 'outline'}
              size="sm"
              className="w-full gap-1.5 text-xs"
              disabled={state !== 'idle'}
              onClick={handleAddClick}
            >
              {state === 'added' ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  В библиотеке
                </>
              ) : state === 'loading' ? (
                'Добавляю...'
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Добавить
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {tmdbId != null && (
        <RecommendationDetailDialog
          tmdbId={tmdbId}
          type={type}
          reason={reason}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}

      {tmdbId != null && (
        <AddToLibraryDialog
          title={title}
          type={mediaType}
          posterUrl={posterUrl}
          releaseYear={year}
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          state={state}
          status={status}
          onStatusChange={setStatus}
          rating={rating}
          onRatingChange={setRating}
          onConfirm={handleAddConfirm}
        />
      )}
    </>
  )
}
