'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { Button } from '@/components/ui/button'
import { EpisodeRow } from './EpisodeRow'
import { toggleEpisode, markSeason, markAllTitle } from '@/app/actions/progress'
import type { SeasonWithEpisodes, Episode } from '@/types'

interface SeasonAccordionProps {
  seasons: SeasonWithEpisodes[]
  mediaItemId: string
}

type EpisodeMap = Record<string, Episode>

function buildEpisodeMap(seasons: SeasonWithEpisodes[]): EpisodeMap {
  const map: EpisodeMap = {}
  for (const season of seasons) {
    for (const ep of season.episodes) {
      map[ep.id] = ep
    }
  }
  return map
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    // retry once after a short delay to handle transient network errors
    await new Promise<void>(resolve => setTimeout(resolve, 100))
    return await fn()
  }
}

export function SeasonAccordion({ seasons, mediaItemId }: SeasonAccordionProps) {
  const [episodeMap, setEpisodeMap] = useState<EpisodeMap>(() => buildEpisodeMap(seasons))
  const [, startTransition] = useTransition()

  // Sync with fresh server data after route revalidation
  useEffect(() => {
    setEpisodeMap(buildEpisodeMap(seasons))
  }, [seasons])

  const allEpisodes = Object.values(episodeMap)
  const allTitleWatched = allEpisodes.length > 0 && allEpisodes.every((e) => e.is_watched)

  function handleToggleEpisode(episodeId: string, isWatched: boolean) {
    const previous = episodeMap[episodeId]
    setEpisodeMap((prev) => ({
      ...prev,
      [episodeId]: { ...prev[episodeId], is_watched: isWatched, watched_at: isWatched ? new Date().toISOString() : null },
    }))
    startTransition(async () => {
      try {
        await withRetry(() => toggleEpisode(episodeId, isWatched))
      } catch {
        setEpisodeMap((prev) => ({ ...prev, [episodeId]: previous }))
        toast.error('Ошибка сохранения')
      }
    })
  }

  function handleMarkSeason(season: SeasonWithEpisodes) {
    const allWatched = season.episodes.every((e) => episodeMap[e.id]?.is_watched)
    const targetWatched = !allWatched
    const previousMap = { ...episodeMap }
    const now = new Date().toISOString()

    setEpisodeMap((prev) => {
      const updated = { ...prev }
      for (const ep of season.episodes) {
        updated[ep.id] = { ...updated[ep.id], is_watched: targetWatched, watched_at: targetWatched ? now : null }
      }
      return updated
    })

    startTransition(async () => {
      try {
        await withRetry(() => markSeason(season.id, targetWatched))
      } catch {
        setEpisodeMap(previousMap)
        toast.error('Ошибка сохранения')
      }
    })
  }

  function handleMarkAllTitle() {
    const targetWatched = !allTitleWatched
    const previousMap = { ...episodeMap }
    const now = new Date().toISOString()

    setEpisodeMap((prev) => {
      const updated = { ...prev }
      for (const id of Object.keys(updated)) {
        updated[id] = { ...updated[id], is_watched: targetWatched, watched_at: targetWatched ? now : null }
      }
      return updated
    })

    startTransition(async () => {
      try {
        await withRetry(() => markAllTitle(mediaItemId, targetWatched))
      } catch {
        setEpisodeMap(previousMap)
        toast.error('Ошибка сохранения')
      }
    })
  }

  return (
    <div className="space-y-2" data-testid="season-accordion">
      {/* Progress header with title-level mark-all button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Прогресс
          </h3>
          {allTitleWatched && (
            <div className="relative group">
              <CheckCircle2
                className="w-4 h-4 text-green-500"
                data-testid="title-watched-indicator"
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-popover text-popover-foreground border border-border rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Тайтл просмотрен
              </div>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`h-7 text-xs transition-colors ${allTitleWatched ? 'border-primary text-primary hover:opacity-80' : ''}`}
          onClick={handleMarkAllTitle}
          data-testid="mark-all-title-button"
        >
          {allTitleWatched ? 'Снять отметку' : 'Отметить всё'}
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {seasons.map((season) => {
          const episodes = season.episodes.map((ep) => episodeMap[ep.id] ?? ep)
          const watchedCount = episodes.filter((e) => e.is_watched).length
          const totalCount = season.episode_count
          const allWatched = watchedCount === totalCount && totalCount > 0

          return (
            <AccordionItem
              key={season.id}
              value={season.id}
              className="border border-border/50 rounded-lg px-4"
            >
              <div className="flex items-center justify-between py-3">
                <AccordionPrimitive.Trigger className="flex flex-1 items-center gap-3 hover:no-underline text-left [&[data-state=open]>svg]:rotate-180">
                  <span className="text-sm font-medium">{season.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {watchedCount}/{totalCount} эп.
                  </span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200" />
                </AccordionPrimitive.Trigger>
                <Button
                  variant="outline"
                  size="sm"
                  className={`ml-2 h-7 text-xs transition-colors ${allWatched ? 'border-primary text-primary hover:opacity-80' : ''}`}
                  onClick={() => handleMarkSeason(season)}
                  data-testid={`mark-season-button-${season.id}`}
                >
                  {allWatched ? 'Снять отметку' : 'Отметить сезон'}
                </Button>
              </div>
              <AccordionContent className="pb-3">
                <div className="space-y-0.5">
                  {episodes.map((ep) => (
                    <EpisodeRow
                      key={ep.id}
                      episode={ep}
                      onToggle={handleToggleEpisode}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
