'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TasteProfileCard } from './TasteProfileCard'
import { RecommendationQuestionnaire } from './RecommendationQuestionnaire'
import { RecommendationResults } from './RecommendationResults'
import type { TasteProfile, QuestionnaireAnswers, RecommendationCardData } from '@/types/recommendations'

const INTRO_DONE_MARKER = '\n__INTRO_DONE__\n'
const CARDS_MARKER = '\n__CARDS__:'

type Phase = 'questionnaire' | 'streaming' | 'results'

interface Props {
  initialProfile: TasteProfile | null
  itemCount: number
}

export function RecommendationsPage({ initialProfile, itemCount }: Props) {
  const [profile, setProfile] = useState<TasteProfile | null>(initialProfile)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [phase, setPhase] = useState<Phase>('questionnaire')
  const [introText, setIntroText] = useState('')
  const [isStreamingIntro, setIsStreamingIntro] = useState(false)
  const [isLoadingCards, setIsLoadingCards] = useState(false)
  const [cards, setCards] = useState<RecommendationCardData[]>([])

  async function handleUpdateProfile() {
    setIsUpdatingProfile(true)
    try {
      const res = await fetch('/api/recommendations/profile', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message ?? 'Не удалось обновить профиль')
        return
      }
      setProfile({ summary: data.summary, updated_at: data.updated_at })
      toast.success('Профиль вкусов обновлён')
    } catch {
      toast.error('Ошибка при обновлении профиля')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  async function handleSubmitQuestionnaire(answers: QuestionnaireAnswers) {
    setPhase('streaming')
    setIntroText('')
    setIsStreamingIntro(true)
    setIsLoadingCards(false)
    setCards([])

    try {
      const res = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaire: answers }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'no_profile') {
          toast.error('Сначала создай профиль вкусов')
        } else {
          toast.error('Не удалось получить рекомендации')
        }
        setPhase('questionnaire')
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let introDone = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk

        // Check for CARDS marker
        const cardsIdx = accumulated.indexOf(CARDS_MARKER)
        if (cardsIdx !== -1) {
          const cardsJson = accumulated.slice(cardsIdx + CARDS_MARKER.length).trim()
          try {
            const parsed = JSON.parse(cardsJson) as RecommendationCardData[]
            setCards(parsed)
          } catch {
            toast.error('Не удалось разобрать список рекомендаций')
          }
          setIsLoadingCards(false)
          setIsStreamingIntro(false)
          setPhase('results')
          break
        }

        // Check for intro done marker
        const introDoneIdx = accumulated.indexOf(INTRO_DONE_MARKER)
        if (introDoneIdx !== -1 && !introDone) {
          introDone = true
          const finalIntro = accumulated.slice(0, introDoneIdx)
          setIntroText(finalIntro)
          setIsStreamingIntro(false)
          setIsLoadingCards(true)
        } else if (!introDone) {
          // Still streaming intro
          setIntroText(accumulated)
        }
      }
    } catch {
      toast.error('Ошибка соединения при получении рекомендаций')
      setPhase('questionnaire')
    }
  }

  function handleReset() {
    setPhase('questionnaire')
    setIntroText('')
    setCards([])
    setIsStreamingIntro(false)
    setIsLoadingCards(false)
  }

  const tooFewItems = itemCount < 5
  const hasProfile = profile !== null
  const questionnaireDisabled = tooFewItems || !hasProfile || isUpdatingProfile

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Для тебя</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Персональные рекомендации на основе твоей библиотеки
        </p>
      </div>

      {/* Taste profile block */}
      <TasteProfileCard
        profile={profile}
        itemCount={itemCount}
        onUpdate={handleUpdateProfile}
        isUpdating={isUpdatingProfile}
      />

      {/* Too few items blocker */}
      {tooFewItems && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <span>
            Добавь хотя бы <strong className="text-foreground">5 тайтлов</strong> в библиотеку — тогда
            получишь персонализированные рекомендации.
          </span>
        </div>
      )}

      {/* Questionnaire or results */}
      {phase === 'questionnaire' && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold">Настрой рекомендации</p>
            {!hasProfile && !tooFewItems && (
              <p className="text-xs text-amber-500/90 mt-1">
                Создай профиль вкусов, чтобы разблокировать анкету
              </p>
            )}
          </div>
          <RecommendationQuestionnaire
            onSubmit={handleSubmitQuestionnaire}
            isLoading={false}
            disabled={questionnaireDisabled}
          />
        </div>
      )}

      {(phase === 'streaming' || phase === 'results') && (
        <RecommendationResults
          introText={introText}
          isStreamingIntro={isStreamingIntro}
          isLoadingCards={isLoadingCards}
          cards={cards}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
