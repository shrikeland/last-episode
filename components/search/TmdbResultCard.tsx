'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Plus, Check, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { addMediaItem } from '@/app/actions/tmdb'
import { MEDIA_TYPE_LABELS } from '@/types'
import type { TmdbSearchResult } from '@/types'

const ERROR_MESSAGES = {
  already_exists: 'Уже в вашей коллекции',
  tmdb_error: 'Ошибка получения данных TMDB',
  db_error: 'Ошибка сохранения',
}

interface TmdbResultCardProps {
  result: TmdbSearchResult
  initialAdded?: boolean
}

export function TmdbResultCard({ result, initialAdded = false }: TmdbResultCardProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'added'>(initialAdded ? 'added' : 'idle')

  async function handleAdd() {
    setState('loading')
    const res = await addMediaItem(result.tmdb_id, result.type)
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

  return (
    <div
      className="flex gap-3 p-3 bg-card border border-border rounded-lg hover:border-border/80 transition-colors"
      data-testid={`tmdb-result-card-${result.tmdb_id}`}
    >
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
          {result.release_year && (
            <span className="text-xs text-muted-foreground">{result.release_year}</span>
          )}
        </div>
        {result.overview && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.overview}</p>
        )}
      </div>

      {/* Кнопка добавления */}
      <div className="flex-shrink-0 flex items-center">
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