'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, Film, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddToLibraryDialog, type AddToLibraryState } from '@/components/library/AddToLibraryDialog'
import { addMediaItem } from '@/app/actions/tmdb'
import { MEDIA_TYPE_LABELS, type CreateMediaItemOptions, type MediaStatus, type MediaType } from '@/types'

const ERROR_MESSAGES = {
  already_exists: 'Уже в вашей коллекции',
  tmdb_error: 'Ошибка получения данных TMDB',
  db_error: 'Ошибка сохранения',
  invalid_rating: 'Оценка должна быть от 0.5 до 10 с шагом 0.5',
  planned_seasons: 'Нельзя сразу отметить просмотренным: есть запланированные сезоны',
}

const SOURCE_LABELS = {
  collection: 'Одна франшиза',
  recommendation: 'Похоже по стилю',
  similar: 'Схожий тайтл',
}

export interface TitleRecommendationItem {
  tmdbId: number
  title: string
  type: MediaType
  posterUrl: string | null
  releaseYear: number | null
  overview: string
  source: keyof typeof SOURCE_LABELS
}

interface TitleRecommendationsProps {
  items: TitleRecommendationItem[]
  initialAddedIds: number[]
}

function TitleRecommendationCard({
  item,
  initialAdded,
}: {
  item: TitleRecommendationItem
  initialAdded: boolean
}) {
  const [state, setState] = useState<AddToLibraryState>(initialAdded ? 'added' : 'idle')
  const [status, setStatus] = useState<MediaStatus>('planned')
  const [rating, setRating] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  async function handleAdd() {
    setState('loading')
    const options: CreateMediaItemOptions = { status, rating }
    const result = await addMediaItem(item.tmdbId, item.type, options)

    if (result.success) {
      setState('added')
      setOpen(false)
      toast.success(`«${item.title}» добавлен в коллекцию`)
      return
    }

    if (result.error === 'already_exists') {
      setState('added')
      setOpen(false)
      return
    }

    setState('idle')
    toast.error(ERROR_MESSAGES[result.error ?? 'db_error'])
  }

  return (
    <div className="group flex min-w-[150px] max-w-[170px] flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
      <div className="relative aspect-[2/3] bg-secondary">
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="170px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        <Badge className="absolute left-2 top-2 border-0 bg-black/60 text-[10px] text-white backdrop-blur-sm">
          {SOURCE_LABELS[item.source]}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-h-[58px] space-y-1">
          <p className="line-clamp-2 text-sm font-semibold leading-tight">{item.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{MEDIA_TYPE_LABELS[item.type]}</span>
            {item.releaseYear != null && (
              <span className="text-xs text-muted-foreground">· {item.releaseYear}</span>
            )}
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant={state === 'added' ? 'secondary' : 'outline'}
          disabled={state !== 'idle'}
          onClick={() => setOpen(true)}
          className="mt-auto w-full gap-1.5 text-xs"
        >
          {state === 'loading' ? (
            'Добавляю...'
          ) : state === 'added' ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              В библиотеке
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Добавить
            </>
          )}
        </Button>
      </div>

      <AddToLibraryDialog
        title={item.title}
        type={item.type}
        posterUrl={item.posterUrl}
        releaseYear={item.releaseYear}
        open={open}
        onOpenChange={setOpen}
        state={state}
        status={status}
        onStatusChange={setStatus}
        rating={rating}
        onRatingChange={setRating}
        onConfirm={handleAdd}
      />
    </div>
  )
}

export function TitleRecommendations({ items, initialAddedIds }: TitleRecommendationsProps) {
  if (items.length === 0) return null

  const addedIds = new Set(initialAddedIds)

  return (
    <section className="space-y-3" aria-labelledby="title-recommendations-heading">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2
          id="title-recommendations-heading"
          className="text-sm font-medium uppercase tracking-wider text-muted-foreground"
        >
          Рекомендации
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <TitleRecommendationCard
            key={item.tmdbId}
            item={item}
            initialAdded={addedIds.has(item.tmdbId)}
          />
        ))}
      </div>
    </section>
  )
}
