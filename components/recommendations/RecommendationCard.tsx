'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, Plus, Film, Tv, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { addRecommendedTitle } from '@/app/actions/recommendations'
import type { RecommendationCardData } from '@/types/recommendations'
import type { MediaType } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  movie: 'Фильм',
  tv: 'Сериал',
  anime: 'Аниме',
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  movie: Film,
  tv: Tv,
  anime: Sparkles,
}

function normalizeType(type: string): MediaType {
  if (type === 'movie' || type === 'tv' || type === 'anime') return type as MediaType
  return 'movie'
}

export function RecommendationCard({ title, year, type, reason, tmdbId, posterUrl }: RecommendationCardData) {
  const [added, setAdded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [reasonExpanded, setReasonExpanded] = useState(false)

  const TypeIcon = TYPE_ICONS[type] ?? Film
  const mediaType = normalizeType(type)

  function handleAdd() {
    if (!tmdbId || added) return
    startTransition(async () => {
      const result = await addRecommendedTitle(tmdbId, mediaType)
      if (result.error === 'already_exists') {
        toast.info('Уже в библиотеке')
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
    <div
      data-testid="recommendation-card"
      className="group relative flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors"
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
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {tmdbId ? (
          <Link
            href={`/media/${tmdbId}`}
            className="text-sm font-semibold leading-tight hover:text-primary transition-colors line-clamp-2"
          >
            {title}
            {year && <span className="text-muted-foreground font-normal ml-1">({year})</span>}
          </Link>
        ) : (
          <p className="text-sm font-semibold leading-tight line-clamp-2">
            {title}
            {year && <span className="text-muted-foreground font-normal ml-1">({year})</span>}
          </p>
        )}

        <div className="flex-1">
          <p
            className={cn(
              'text-xs text-muted-foreground leading-relaxed',
              !reasonExpanded && 'line-clamp-3'
            )}
          >
            {reason}
          </p>
          {reason.length > 120 && (
            <button
              onClick={() => setReasonExpanded((v) => !v)}
              className="mt-1 flex items-center gap-0.5 text-xs text-primary/70 hover:text-primary transition-colors"
            >
              {reasonExpanded ? (
                <><ChevronUp className="h-3 w-3" />Свернуть</>
              ) : (
                <><ChevronDown className="h-3 w-3" />Читать далее</>
              )}
            </button>
          )}
        </div>

        {tmdbId && (
          <Button
            data-testid="recommendation-add-button"
            variant={added ? 'secondary' : 'outline'}
            size="sm"
            className="w-full mt-auto gap-1.5 text-xs"
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
                {isPending ? 'Добавляю...' : 'Добавить в список'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
