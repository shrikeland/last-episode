'use client'

import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TasteProfile } from '@/types/recommendations'

interface TasteProfileCardProps {
  profile: TasteProfile | null
  itemCount: number
  onUpdate: () => void
  isUpdating: boolean
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

export function TasteProfileCard({ profile, itemCount, onUpdate, isUpdating }: TasteProfileCardProps) {
  const notEnough = itemCount < 5
  const stale = profile ? daysSince(profile.updated_at) > 7 : false

  return (
    <div
      data-testid="taste-profile-card"
      className="rounded-lg border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Профиль вкусов</p>
          {notEnough ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              Добавь хотя бы 5 тайтлов в библиотеку для персонализации
            </div>
          ) : profile ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className={cn('h-3.5 w-3.5', stale ? 'text-amber-500' : 'text-green-500')} />
              Обновлён {formatDate(profile.updated_at)}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              Профиль ещё не создан — нажми &laquo;Обновить&raquo;
            </div>
          )}
        </div>

        <Button
          data-testid="update-profile-button"
          variant="outline"
          size="sm"
          onClick={onUpdate}
          disabled={isUpdating || notEnough}
          className="flex-shrink-0 gap-1.5 text-xs"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isUpdating && 'animate-spin')} />
          {isUpdating ? 'Анализирую...' : 'Обновить профиль'}
        </Button>
      </div>

      {!notEnough && (stale || !profile) && (
        <p className="text-xs text-amber-500/90 leading-relaxed">
          Если ты недавно вносил изменения в библиотеку — обнови профиль перед запросом рекомендаций,
          чтобы они были актуальными.
        </p>
      )}

      {isUpdating && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Анализирую библиотеку... это займёт 5–15 секунд
        </p>
      )}
    </div>
  )
}
