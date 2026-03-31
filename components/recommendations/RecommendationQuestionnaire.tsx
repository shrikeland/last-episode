'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { QuestionnaireAnswers, ContentType, Familiarity } from '@/types/recommendations'
import Stepper, { Step } from '@/components/ui/Stepper'

const CONTENT_TYPES: { value: ContentType; label: string; emoji: string }[] = [
  { value: 'movie', label: 'Фильм', emoji: '🎬' },
  { value: 'animation', label: 'Мультфильм', emoji: '🎨' },
  { value: 'tv', label: 'Сериал', emoji: '📺' },
  { value: 'anime', label: 'Аниме', emoji: '⛩️' },
  { value: 'any', label: 'Неважно', emoji: '🎲' },
]

const MOODS: { value: string; label: string; description: string; emoji: string }[] = [
  { value: 'На расслабоне — хочу что-то лёгкое, уютное и без напряга', label: 'На расслабоне', description: 'хочу что-то лёгкое, уютное и без напряга', emoji: '☕' },
  { value: 'Режим суетолога — нужен движ, экшн и чтобы не отпускало', label: 'Режим суетолога', description: 'нужен движ, экшн и чтобы не отпускало', emoji: '⚡' },
  { value: 'Философ на смене — дайте что-то умное, многослойное и со смыслом', label: 'Философ на смене', description: 'дайте что-то умное, многослойное и со смыслом', emoji: '🧠' },
  { value: 'Стеклянный человек — мне нужно попереживать и поплакать', label: 'Стеклянный человек', description: 'мне нужно попереживать и поплакать', emoji: '😢' },
  { value: 'Генератор хихи — хочу смеяться 5 минут', label: 'Генератор хихи', description: 'хочу смеяться и ни о чём не думать', emoji: '😂' },
  { value: 'Проверю, закрыта ли дверь — дайте что-то жуткое и напряжённое', label: 'Проверю, закрыта ли дверь', description: 'дайте что-то жуткое и напряжённое', emoji: '🚪' },
]

const EXCLUSIONS = [
  'Без грустных концовок',
  'Без насилия и жести',
  'Без растянутых историй',
  'Без романтических линий',
]

const FAMILIARITY_OPTIONS: { value: Familiarity; label: string; description: string }[] = [
  { value: 'new_only', label: 'Только новое', description: 'Тайтлы не из моей библиотеки' },
  { value: 'include_planned', label: 'Включая отложенные', description: 'Новое + из запланированных' },
  { value: 'include_rewatch', label: 'Можно пересмотреть', description: 'Включая любимые тайтлы' },
]

interface Props {
  onSubmit: (answers: QuestionnaireAnswers) => void
  isLoading: boolean
  disabled: boolean
}

export function RecommendationQuestionnaire({ onSubmit, isLoading, disabled }: Props) {
  const [contentType, setContentType] = useState<ContentType | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [exclusions, setExclusions] = useState<string[]>([])
  const [familiarity, setFamiliarity] = useState<Familiarity>('new_only')
  const [currentStep, setCurrentStep] = useState(1)

  function toggleExclusion(tag: string) {
    setExclusions((prev) =>
      prev.includes(tag) ? prev.filter((e) => e !== tag) : [...prev, tag]
    )
  }

  function handleFinalStep() {
    if (!contentType || !mood) return
    onSubmit({ contentType, mood, exclusions, familiarity })
  }

  // Per-step next button disabled state
  const nextDisabled =
    currentStep === 1 ? contentType === null :
    currentStep === 2 ? mood === null :
    isLoading

  return (
    <div
      data-testid="recommendation-questionnaire"
      className={cn(disabled && 'opacity-50 pointer-events-none')}
    >
      <Stepper
        onStepChange={setCurrentStep}
        onFinalStepCompleted={handleFinalStep}
        nextButtonText="Продолжить"
        completeButtonText={isLoading ? 'Подбираю...' : 'Получить рекомендации'}
        nextButtonProps={{ disabled: nextDisabled }}
        disableStepIndicators={false}
      >
        {/* Step 1: Content type */}
        <Step>
          <div className="space-y-3 py-4">
            <p className="text-sm font-semibold text-foreground">Что хочешь посмотреть сегодня?</p>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setContentType(opt.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors',
                    contentType === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  <span>{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Step>

        {/* Step 2: Mood */}
        <Step>
          <div className="space-y-3 py-4">
            <p className="text-sm font-semibold text-foreground">Какой ты сегодня?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOODS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMood(opt.value)}
                  className={cn(
                    'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors',
                    mood === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{opt.emoji}</span>
                  <span className="flex flex-col gap-0.5">
                    <span className={cn('text-sm font-semibold leading-tight', mood === opt.value ? 'text-primary' : 'text-foreground')}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">{opt.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Step>

        {/* Step 3: Exclusions + Familiarity */}
        <Step>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Что не хочешь сегодня?{' '}
                <span className="font-normal text-muted-foreground">(необязательно)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {EXCLUSIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleExclusion(tag)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors',
                      exclusions.includes(tag)
                        ? 'border-destructive/60 bg-destructive/10 text-destructive'
                        : 'border-border text-muted-foreground hover:border-destructive/30 hover:text-foreground'
                    )}
                  >
                    {exclusions.includes(tag) ? '✗' : '+'} {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Из чего выбираем?</p>
              <div className="flex flex-col sm:flex-row gap-2">
                {FAMILIARITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFamiliarity(opt.value)}
                    className={cn(
                      'flex-1 flex flex-col items-start px-3 py-2 rounded-lg border text-sm transition-colors',
                      familiarity === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <span className={cn('font-medium', familiarity === opt.value ? 'text-primary' : 'text-foreground')}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Step>
      </Stepper>
    </div>
  )
}