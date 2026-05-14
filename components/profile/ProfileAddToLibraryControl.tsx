'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { addMediaItem } from '@/app/actions/tmdb'
import { AddToLibraryDialog, type AddToLibraryState } from '@/components/library/AddToLibraryDialog'
import { Button } from '@/components/ui/button'
import type { CreateMediaItemOptions, MediaItem, MediaStatus } from '@/types'

const ERROR_MESSAGES = {
  already_exists: 'Уже в вашей коллекции',
  tmdb_error: 'Ошибка получения данных TMDB',
  db_error: 'Не удалось добавить',
  invalid_rating: 'Оценка должна быть от 0.5 до 10 с шагом 0.5',
  planned_seasons: 'Нельзя сразу отметить просмотренным: есть запланированные сезоны',
}

interface ProfileAddToLibraryControlProps {
  item: Pick<MediaItem, 'tmdb_id' | 'title' | 'type' | 'poster_url' | 'release_year'>
  initialAdded?: boolean
  className?: string
  iconOnly?: boolean
}

export function ProfileAddToLibraryControl({
  item,
  initialAdded = false,
  className,
  iconOnly = false,
}: ProfileAddToLibraryControlProps) {
  const [state, setState] = useState<AddToLibraryState>(initialAdded ? 'added' : 'idle')
  const [status, setStatus] = useState<MediaStatus>('planned')
  const [rating, setRating] = useState<number | null>(null)
  const [open, setOpen] = useState(false)

  async function handleAdd() {
    setState('loading')
    const options: CreateMediaItemOptions = { status, rating }
    const result = await addMediaItem(item.tmdb_id, item.type, options)

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
    <>
      <Button
        type="button"
        size="sm"
        variant={state === 'added' ? 'secondary' : 'outline'}
        disabled={state !== 'idle'}
        onClick={() => setOpen(true)}
        className={className}
        aria-label={state === 'added' ? 'Тайтл уже в библиотеке' : `Добавить «${item.title}»`}
        title={state === 'added' ? 'В библиотеке' : 'Добавить'}
      >
        {iconOnly ? (
          state === 'added' ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )
        ) : state === 'loading' ? (
          'Добавляю...'
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

      <AddToLibraryDialog
        title={item.title}
        type={item.type}
        posterUrl={item.poster_url}
        releaseYear={item.release_year}
        open={open}
        onOpenChange={setOpen}
        state={state}
        status={status}
        onStatusChange={setStatus}
        rating={rating}
        onRatingChange={setRating}
        onConfirm={handleAdd}
      />
    </>
  )
}
