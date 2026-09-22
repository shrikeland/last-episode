'use client'

import { useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { Check, Film, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollRow } from './ScrollRow'
import { watchNextEpisode } from '@/app/actions/progress'
import { withRetry } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import type { ContinueItem, EpisodeProgress } from '@/types'

interface ContinueWatchingProps {
  items: ContinueItem[]
  progressMap: Record<string, EpisodeProgress>
}

function formatEpisode(seasonNumber: number, episodeNumber: number): string {
  return `S${seasonNumber} · E${String(episodeNumber).padStart(2, '0')}`
}

export function ContinueWatching({ items, progressMap }: ContinueWatchingProps) {
  const { accent } = useTheme()
  const [entries, setEntries] = useState(items)
  const [pending, setPending] = useState<Set<string>>(() => new Set())
  const [, startTransition] = useTransition()

  // Sync with fresh server data after route revalidation
  useEffect(() => {
    setEntries(items)
  }, [items])

  function setItemPending(id: string, isPending: boolean) {
    setPending((prev) => {
      const next = new Set(prev)
      if (isPending) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleMark(entry: ContinueItem) {
    const itemId = entry.item.id
    setItemPending(itemId, true)
    startTransition(async () => {
      try {
        const next = await withRetry(() => watchNextEpisode(itemId, entry.next.id))
        setEntries((prev) =>
          next
            ? prev.map((e) => (e.item.id === itemId ? { ...e, next } : e))
            : prev.filter((e) => e.item.id !== itemId)
        )
      } catch {
        toast.error('Ошибка сохранения')
      } finally {
        setItemPending(itemId, false)
      }
    })
  }

  if (entries.length === 0) return null

  return (
    <section className="space-y-3" data-testid="continue-watching">
      <div className="flex items-center gap-2.5">
        <Play className="h-3.5 w-3.5" style={{ color: accent }} />
        <h2
          className="text-xs font-bold tracking-[0.12em] uppercase"
          style={{ color: 'hsl(210 100% 93%)' }}
        >
          Продолжить
        </h2>
        <div
          className="flex-1 h-px"
          style={{ background: 'linear-gradient(90deg, hsl(213 44% 20%) 0%, transparent 100%)' }}
        />
      </div>

      <ScrollRow>
        {entries.map((entry) => {
          const { item, next } = entry
          const isPending = pending.has(item.id)
          const progress = progressMap[item.id]
          const progressPct = progress?.total
            ? Math.round((progress.watched / progress.total) * 100)
            : 0

          return (
            <div
              key={item.id}
              className="flex-shrink-0 w-[272px] sm:w-[300px] flex gap-3 rounded-lg border border-border/60 bg-card p-2.5"
              data-testid={`continue-card-${item.id}`}
            >
              <Link
                href={`/media/${item.id}`}
                className="relative w-14 shrink-0 aspect-[2/3] overflow-hidden rounded"
                style={{ background: 'hsl(213 50% 8%)' }}
                aria-label={item.title}
              >
                {item.poster_url ? (
                  <Image src={item.poster_url} alt="" fill className="object-cover" sizes="56px" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Film className="h-5 w-5" style={{ color: 'hsl(210 14% 30%)' }} />
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`/media/${item.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {item.title}
                </Link>
                <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="shrink-0 font-mono">
                    {formatEpisode(next.season_number, next.episode_number)}
                  </span>
                  <span className="truncate">{next.name}</span>
                </p>
                {next.is_filler && (
                  <span className="mt-1 w-fit rounded border border-amber-500/30 px-1.5 text-[10px] text-amber-500/70">
                    Филлер
                  </span>
                )}

                <div className="mt-auto flex items-center gap-2 pt-2">
                  <div
                    className="h-0.5 flex-1 overflow-hidden rounded-full"
                    style={{ background: 'hsl(213 44% 16%)' }}
                  >
                    <div
                      className="h-full transition-[width] duration-300"
                      style={{ width: `${progressPct}%`, background: accent }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => handleMark(entry)}
                    disabled={isPending}
                    data-testid={`continue-mark-${item.id}`}
                    aria-label={`Отметить просмотренной: ${item.title}, ${formatEpisode(next.season_number, next.episode_number)}`}
                  >
                    <Check className="h-3.5 w-3.5" style={isPending ? { color: accent } : undefined} />
                    {isPending ? 'Отмечено' : 'Просмотрено'}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </ScrollRow>
    </section>
  )
}
