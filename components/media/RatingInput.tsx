'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { updateRating } from '@/app/actions/progress'

interface RatingInputProps {
  mediaItemId: string
  currentRating: number | null
}

function StarIcon({ fill }: { fill: 'full' | 'half' | 'empty' }) {
  const fillPercent = fill === 'full' ? '100%' : fill === 'half' ? '50%' : '0%'

  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <Star
        className="absolute inset-0 h-5 w-5 text-border"
        strokeWidth={1.8}
        fill="currentColor"
      />
      <span
        className="absolute inset-0 overflow-hidden text-primary"
        style={{ width: fillPercent }}
      >
        <Star
          className="h-5 w-5"
          strokeWidth={1.8}
          fill="currentColor"
        />
      </span>
      <Star
        className="absolute inset-0 h-5 w-5 text-primary"
        strokeWidth={1.8}
      />
    </span>
  )
}

function getStarFill(starIndex: number, rating: number | null): 'full' | 'half' | 'empty' {
  if (rating === null) return 'empty'
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  if (starIndex < full) return 'full'
  if (starIndex === full && half) return 'half'
  return 'empty'
}

export function RatingInput({ mediaItemId, currentRating }: RatingInputProps) {
  const [rating, setRating] = useState<number | null>(currentRating)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  const displayRating = hoverRating ?? rating

  function handleClick(value: number) {
    const newRating = value === rating ? null : value
    setRating(newRating)
    startTransition(async () => {
      await updateRating(mediaItemId, newRating)
    })
  }

  return (
    <div className="flex items-center gap-2" data-testid="rating-input">
      <div
        className="flex"
        onMouseLeave={() => setHoverRating(null)}
      >
        {Array.from({ length: 10 }, (_, i) => i).map((starIndex) => (
          <div
            key={starIndex}
            className="relative h-5 w-5 transition-transform hover:scale-110"
          >
            <StarIcon fill={getStarFill(starIndex, displayRating)} />
            <button
              type="button"
              className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
              onMouseEnter={() => setHoverRating(starIndex + 0.5)}
              onClick={() => handleClick(starIndex + 0.5)}
              aria-label={`Оценка ${starIndex + 0.5}`}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
              onMouseEnter={() => setHoverRating(starIndex + 1)}
              onClick={() => handleClick(starIndex + 1)}
              aria-label={`Оценка ${starIndex + 1}`}
            />
          </div>
        ))}
      </div>
      <span className="text-sm text-muted-foreground min-w-[52px]">
        {displayRating !== null ? `${displayRating} / 10` : '—'}
      </span>
    </div>
  )
}
