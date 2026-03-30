'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { CheckCircle, Plus, Film, Tv, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { addRecommendedTitle } from '@/app/actions/recommendations'
import { RecommendationDetailDialog } from './RecommendationDetailDialog'
import type { RecommendationCardData } from '@/types/recommendations'
import type { MediaType } from '@/types'

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

function normalizeType(type: string): MediaType {
  if (type === 'movie' || type === 'animation' || type === 'tv' || type === 'anime') return type as MediaType
  return 'movie'
}

export function RecommendationCard({ title, year, type, reason, tmdbId, posterUrl, initialAdded = false }: RecommendationCardData & { initialAdded?: boolean }) {
  const [added, setAdded] = useState(initialAdded)
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)

  const TypeIcon = TYPE_ICONS[type] ?? Film
  const mediaType = normalizeType(type)

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (!tmdbId || added) return
    startTransition(async () => {
      const result = await addRecommendedTitle(tmdbId, mediaType)
      if (result.error === 'already_exists') {
        setAdded(true)
      } else if (result.error) {
        toast.error('Не удалось добавить')
      } else {
        toast.success('Добавлено в список')
        setAdded(true)
      }
    })
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
          {tmdbId && (
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

          {tmdbId && (
            <Button
              data-testid="recommendation-add-button"
              variant={added ? 'secondary' : 'outline'}
              size="sm"
              className="w-full gap-1.5 text-xs"
              disabled={isPending || added}
              onClick={handleAdd}
            >
              {added ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  В библиотеке
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  {isPending ? 'Добавляю...' : 'Добавить'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {tmdbId && (
        <RecommendationDetailDialog
          tmdbId={tmdbId}
          type={type}
          reason={reason}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  )
}