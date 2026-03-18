'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { EpisodeRow } from './EpisodeRow'
import { toggleEpisode, markSeason } from '@/app/actions/progress'
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
    // retry once
    return await fn()
  }
}

export function SeasonAccordion({ seasons, mediaItemId: _mediaItemId }: SeasonAccordionProps) {
  const [episodeMap, setEpisodeMap] = useState<EpisodeMap>(() => buildEpisodeMap(seasons))
  const [, startTransition] = useTransition()

  // Sync with fresh server data after route revalidation
  useEffect(() => {
    setEpisodeMap(buildEpisodeMap(seasons))
  }, [seasons])

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

  return (
    <div className="space-y-2" data-testid="season-accordion">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Прогресс
      </h3>
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
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{season.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {watchedCount}/{totalCount} эп.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkSeason(season)
                    }}
                  >
                    {allWatched ? 'Снять отметку' : 'Отметить всё'}
                  </Button>
                </div>
              </AccordionTrigger>
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