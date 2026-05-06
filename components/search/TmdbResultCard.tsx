'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Plus, Check, Film, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

  async function handleAdd() {
    setState('loading')
    const rating = ratingValue === 'none' ? null : Number(ratingValue)
    const options: CreateMediaItemOptions = { status, rating }
    const res = await addMediaItem(result.tmdb_id, result.type, options)
    if (res.success) {
      setState('added')
      toast.success(`«${result.title}» добавлен в коллекцию`)
    } else if (res.error === 'already_exists') {
      setState('added')
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
      className="flex flex-col gap-3 p-3 bg-card border border-border rounded-lg hover:border-border/80 transition-colors md:flex-row"
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

      {/* Параметры добавления */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 md:w-[390px] md:justify-end">
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as MediaStatus)}
          disabled={state !== 'idle'}
        >
          <SelectTrigger className="h-9 w-[148px]" aria-label="Статус тайтла">
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

        <Select
          value={ratingValue}
          onValueChange={setRatingValue}
          disabled={state !== 'idle'}
        >
          <SelectTrigger className="h-9 w-[120px]" aria-label="Оценка тайтла">
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

        <Button
          size="sm"
          variant={state === 'added' ? 'secondary' : 'default'}
          onClick={handleAdd}
          disabled={state !== 'idle'}
          className="gap-1.5"
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
    </div>
  )
}
