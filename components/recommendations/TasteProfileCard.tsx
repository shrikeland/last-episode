'use client'

import { useEffect, useId, useRef, useState } from 'react'
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

/**
 * The LLM may answer with light markdown (the prompt asks for a numbered structure).
 * We show plain text, so strip the most common markers for display only —
 * the stored summary (and the recommendations prompt) keep the original text.
 */
function normalizeProfileText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      // horizontal rules: ---, ***, ___
      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) return ''
      return line
        .replace(/^\s*#{1,6}\s+/, '') // headings
        .replace(/^(\s*)[-*]\s+/, '$1• ') // bullet lists
        .replaceAll('**', '')
        .replaceAll('__', '')
        .trimEnd()
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function TasteProfileSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [isClamped, setIsClamped] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const textId = useId()

  // Show the toggle only when the collapsed text is actually cut off.
  // Line count depends on the card width, so measure instead of guessing by length;
  // ResizeObserver fires on observe() and again whenever the width changes.
  useEffect(() => {
    const el = textRef.current
    if (!el || expanded) return
    const observer = new ResizeObserver(() => {
      setIsClamped(el.scrollHeight > el.clientHeight + 1)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [expanded])

  return (
    <div className="space-y-1.5 border-t border-border pt-3">
      <p
        id={textId}
        ref={textRef}
        data-testid="taste-profile-summary"
        className={cn(
          'whitespace-pre-line text-sm leading-relaxed text-foreground/90',
          !expanded && 'line-clamp-4'
        )}
      >
        {text}
      </p>
      {(isClamped || expanded) && (
        <button
          type="button"
          data-testid="taste-profile-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={textId}
          className="rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? 'Свернуть' : 'Читать полностью'}
        </button>
      )}
    </div>
  )
}

export function TasteProfileCard({ profile, itemCount, onUpdate, isUpdating }: TasteProfileCardProps) {
  const notEnough = itemCount < 5
  const stale = profile ? daysSince(profile.updated_at) > 7 : false
  const summaryText = profile ? normalizeProfileText(profile.summary ?? '') : ''

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

      {/* key: a fresh profile remounts the block — collapsed and re-measured */}
      {!notEnough && profile && summaryText && (
        <TasteProfileSummary key={profile.updated_at} text={summaryText} />
      )}

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
