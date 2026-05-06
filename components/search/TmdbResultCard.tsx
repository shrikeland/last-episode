'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Plus, Check, Film, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addMediaItem } from '@/app/actions/tmdb'
import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS } from '@/types'
import type { CreateMediaItemOptions, MediaStatus, TmdbSearchResult } from '@/types'

const ERROR_MESSAGES = {
  already_exists: 'Уже в вашей коллекции',
  tmdb_error: 'Ошибка получения данных TMDB',
  db_error: 'Ошибка сохранения',
  invalid_rating: 'Оценка должна быть от 0.5 до 10 с шагом 0.5',
  planned_seasons: 'Нельзя сразу отметить просмотренным: есть запланированные сезоны',
}

const RATING_OPTIONS = Array.from({ length: 20 }, (_, index) => (index + 1) / 2)

interface TmdbResultCardProps {
  result: TmdbSearchResult
  initialAdded?: boolean
}

export function TmdbResultCard({ result, initialAdded = false }: TmdbResultCardProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'added'>(initialAdded ? 'added' : 'idle')
  const [status, setStatus] = useState<MediaStatus>('planned')
  const [ratingValue, setRatingValue] = useState('none')
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  async function handleAdd() {
    setState('loading')
    const rating = ratingValue === 'none' ? null : Number(ratingValue)
    const options: CreateMediaItemOptions = { status, rating }
    const res = await addMediaItem(result.tmdb_id, result.type, options)
    if (res.success) {
      setState('added')
      setIsDialogOpen(false)
      toast.success(`«${result.title}» добавлен в коллекцию`)
    } else if (res.error === 'already_exists') {
      setState('added')
      setIsDialogOpen(false)
    } else {
      setState('idle')
      toast.error(ERROR_MESSAGES[res.error ?? 'db_error'])
    }
  }

  const posterUrl = result.poster_path
    ? `https://image.tmdb.org/t/p/w92${result.poster_path}`
    : null
  const canToggleOverview = result.overview.length > 180

  return (
    <div
      className="flex flex-col gap-3 p-3 bg-card border border-border rounded-lg hover:border-border/80 transition-colors sm:flex-row"
      data-testid={`tmdb-result-card-${result.tmdb_id}`}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        {/* Постер */}
        <div className="relative w-12 h-[72px] flex-shrink-0 bg-secondary rounded overflow-hidden">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={result.title}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Инфо */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight line-clamp-1">{result.title}</p>
          {result.original_title && result.original_title !== result.title && (
            <p className="text-xs text-muted-foreground line-clamp-1">{result.original_title}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {MEDIA_TYPE_LABELS[result.type]}
            </Badge>
            {result.release_year != null && (
              <span className="text-xs text-muted-foreground">{result.release_year}</span>
            )}
          </div>
          {result.overview && (
            <div className="mt-1">
              <p
                className={`text-xs text-muted-foreground ${
                  canToggleOverview && !isOverviewExpanded ? 'line-clamp-2' : ''
                }`}
              >
                {result.overview}
              </p>
              {canToggleOverview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOverviewExpanded((value) => !value)}
                  className="mt-1 h-6 gap-1 px-0 text-xs text-primary hover:bg-transparent"
                >
                  {isOverviewExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Свернуть
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Подробнее
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-start sm:w-[116px] sm:justify-end">
        <Button
          size="sm"
          variant={state === 'added' ? 'secondary' : 'default'}
          onClick={() => setIsDialogOpen(true)}
          disabled={state !== 'idle'}
          className="w-full gap-1.5 sm:w-auto"
        >
          {state === 'loading' ? (
            'Добавляем...'
          ) : state === 'added' ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Добавлено
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Добавить
            </>
          )}
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Добавить в библиотеку</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {result.title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
            <div className="relative h-[84px] w-14 shrink-0 overflow-hidden rounded bg-secondary">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={result.title}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Film className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="line-clamp-2 text-sm font-medium leading-tight">{result.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                  {MEDIA_TYPE_LABELS[result.type]}
                </Badge>
                {result.release_year != null && (
                  <span className="text-xs text-muted-foreground">{result.release_year}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Статус
              </label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as MediaStatus)}
                disabled={state !== 'idle'}
              >
                <SelectTrigger className="h-10" aria-label="Статус тайтла">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEDIA_STATUS_LABELS) as MediaStatus[]).map((itemStatus) => (
                    <SelectItem key={itemStatus} value={itemStatus}>
                      {MEDIA_STATUS_LABELS[itemStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Оценка
              </label>
              <Select
                value={ratingValue}
                onValueChange={setRatingValue}
                disabled={state !== 'idle'}
              >
                <SelectTrigger className="h-10" aria-label="Оценка тайтла">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без оценки</SelectItem>
                  {RATING_OPTIONS.map((rating) => (
                    <SelectItem key={rating} value={String(rating)}>
                      {rating}/10
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 shrink-0 text-[#F39C12]" />
            Оценку можно оставить пустой и поставить позже в карточке тайтла.
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={state === 'loading'}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={state !== 'idle'}
              className="gap-1.5"
            >
              {state === 'loading' ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
