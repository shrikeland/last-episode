'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Star, Film } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Badge } from '@/components/ui/badge'
import { getRecommendationDetails } from '@/app/actions/recommendations'
import type { RecommendationDetails } from '@/types/recommendations'

interface Props {
  tmdbId: number
  type: string
  reason: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecommendationDetailDialog({ tmdbId, type, reason, open, onOpenChange }: Props) {
  const [details, setDetails] = useState<RecommendationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(false)
    setDetails(null)
    getRecommendationDetails(tmdbId, type, reason).then((res) => {
      if (res.data) setDetails(res.data)
      else setError(true)
      setLoading(false)
    })
  }, [open, tmdbId, type, reason])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* DialogTitle must always be present for accessibility */}
        {(loading || error) && (
          <VisuallyHidden>
            <DialogTitle>Детали тайтла</DialogTitle>
          </VisuallyHidden>
        )}

        {loading && (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {error && !loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Не удалось загрузить информацию
          </p>
        )}

        {details && !loading && (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="pr-6 leading-snug">
                {details.title}
                {details.year != null && (
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    ({details.year})
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex gap-4">
              {/* Poster */}
              <div className="relative w-24 flex-shrink-0 overflow-hidden rounded aspect-[2/3] bg-secondary">
                {details.posterUrl ? (
                  <Image
                    src={details.posterUrl}
                    alt={details.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Film className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="flex flex-col gap-2 flex-1">
                {details.voteAverage !== null && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold">{details.voteAverage.toFixed(1)}</span>
                    {details.voteCount !== null && (
                      <span className="text-xs text-muted-foreground">
                        ({details.voteCount.toLocaleString('ru-RU')})
                      </span>
                    )}
                  </div>
                )}

                {details.runtime && (
                  <p className="text-sm text-muted-foreground">{details.runtime}</p>
                )}

                {details.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {details.genres.map((g) => (
                      <Badge key={g} variant="secondary" className="text-xs">
                        {g}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {details.overview && (
              <p className="text-sm leading-relaxed text-foreground/80">{details.overview}</p>
            )}

            {details.director && (
              <p className="text-sm">
                <span className="text-muted-foreground">Режиссёр: </span>
                {details.director}
              </p>
            )}

            {details.cast.length > 0 && (
              <p className="text-sm">
                <span className="text-muted-foreground">В ролях: </span>
                {details.cast.join(', ')}
              </p>
            )}

            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">
                Почему тебе подойдёт
              </span>
              <p className="text-sm leading-relaxed text-foreground/80">{details.reason}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}