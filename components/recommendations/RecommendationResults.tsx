'use client'

import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecommendationCard } from './RecommendationCard'
import type { RecommendationCardData } from '@/types/recommendations'

interface Props {
  introText: string
  isStreamingIntro: boolean
  isLoadingCards: boolean
  cards: RecommendationCardData[]
  onReset: () => void
}

export function RecommendationResults({
  introText,
  isStreamingIntro,
  isLoadingCards,
  cards,
  onReset,
}: Props) {
  const showIntro = introText.length > 0
  const showCards = cards.length > 0
  const showInitialLoader = isStreamingIntro && !showIntro

  return (
    <div data-testid="recommendation-results" className="space-y-6">
      {/* Initial loader — before first streaming token arrives */}
      {showInitialLoader && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="animate-pulse">Куратор думает над рекомендациями...</span>
        </div>
      )}

      {/* Intro text (streaming) */}
      {showIntro && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {introText}
            {isStreamingIntro && (
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-primary animate-pulse align-text-bottom" />
            )}
          </p>
        </div>
      )}

      {/* Loading indicator: intro done, waiting for cards */}
      {isLoadingCards && !showCards && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="animate-pulse">Формирую список рекомендаций...</span>
        </div>
      )}

      {/* Cards grid */}
      {showCards && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {cards.map((card, idx) => (
            <RecommendationCard key={`${card.title}-${idx}`} {...card} />
          ))}
        </div>
      )}

      {/* Reset button */}
      {showCards && (
        <div className="flex justify-center pt-2">
          <Button
            data-testid="new-questionnaire-button"
            variant="outline"
            onClick={onReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Новая анкета
          </Button>
        </div>
      )}
    </div>
  )
}
