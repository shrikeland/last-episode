'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Film, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS } from '@/types'
import type { MediaStatus, MediaType } from '@/types'

export type AddToLibraryState = 'idle' | 'loading' | 'added'

export interface AddToLibraryDialogProps {
  title: string
  type: MediaType
  posterUrl: string | null
  releaseYear: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  state: AddToLibraryState
  status: MediaStatus
  onStatusChange: (status: MediaStatus) => void
  rating: number | null
  onRatingChange: (rating: number | null) => void
  onConfirm: () => void | Promise<void>
}

function RatingStar({ fill }: { fill: 'full' | 'half' | 'empty' }) {
  const fillPercent = fill === 'full' ? '100%' : fill === 'half' ? '50%' : '0%'

  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <Star
        className="absolute inset-0 h-5 w-5 text-border"
        strokeWidth={1.8}
        fill="currentColor"
      />
      <span
        className="absolute inset-0 overflow-hidden text-[#F39C12]"
        style={{ width: fillPercent }}
      >
        <Star
          className="h-5 w-5"
          strokeWidth={1.8}
          fill="currentColor"
        />
      </span>
      <Star
        className="absolute inset-0 h-5 w-5 text-[#F39C12]"
        strokeWidth={1.8}
      />
    </span>
  )
}

function getRatingStarFill(starIndex: number, rating: number | null): 'full' | 'half' | 'empty' {
  if (rating === null) return 'empty'
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  if (starIndex < full) return 'full'
  if (starIndex === full && half) return 'half'
  return 'empty'
}

interface DialogRatingPickerProps {
  rating: number | null
  onChange: (rating: number | null) => void
  disabled?: boolean
}

function DialogRatingPicker({ rating, onChange, disabled = false }: DialogRatingPickerProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const displayRating = hoverRating ?? rating

  function handlePick(value: number) {
    if (disabled) return
    onChange(value === rating ? null : value)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">Оценка</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled || rating === null}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          Сбросить
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2">
        <div
          className="flex"
          onMouseLeave={() => setHoverRating(null)}
        >
          {Array.from({ length: 10 }, (_, i) => i).map((starIndex) => (
            <div
              key={starIndex}
              className="relative h-5 w-5 transition-transform hover:scale-110"
            >
              <RatingStar fill={getRatingStarFill(starIndex, displayRating)} />
              <button
                type="button"
                className="absolute inset-y-0 left-0 w-1/2 cursor-pointer disabled:cursor-not-allowed"
                onMouseEnter={() => !disabled && setHoverRating(starIndex + 0.5)}
                onClick={() => handlePick(starIndex + 0.5)}
                disabled={disabled}
                aria-label={`Оценка ${starIndex + 0.5}`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 w-1/2 cursor-pointer disabled:cursor-not-allowed"
                onMouseEnter={() => !disabled && setHoverRating(starIndex + 1)}
                onClick={() => handlePick(starIndex + 1)}
                disabled={disabled}
                aria-label={`Оценка ${starIndex + 1}`}
              />
            </div>
          ))}
        </div>
        <span className="min-w-[58px] text-sm text-muted-foreground">
          {displayRating !== null ? `${displayRating}/10` : '—'}
        </span>
      </div>
    </div>
  )
}

export function AddToLibraryDialog({
  title,
  type,
  posterUrl,
  releaseYear,
  open,
  onOpenChange,
  state,
  status,
  onStatusChange,
  rating,
  onRatingChange,
  onConfirm,
}: AddToLibraryDialogProps) {
  const isIdle = state === 'idle'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Добавить в библиотеку</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
          <div className="relative h-[84px] w-14 shrink-0 overflow-hidden rounded bg-secondary">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={title}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Film className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="line-clamp-2 text-sm font-medium leading-tight">{title}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {MEDIA_TYPE_LABELS[type]}
              </Badge>
              {releaseYear != null && (
                <span className="text-xs text-muted-foreground">{releaseYear}</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Статус
            </label>
            <Select
              value={status}
              onValueChange={(value) => onStatusChange(value as MediaStatus)}
              disabled={!isIdle}
            >
              <SelectTrigger className="h-10" aria-label="Статус тайтла">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MEDIA_STATUS_LABELS) as MediaStatus[]).map((itemStatus) => (
                  <SelectItem key={itemStatus} value={itemStatus}>
                    {MEDIA_STATUS_LABELS[itemStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogRatingPicker
            rating={rating}
            onChange={onRatingChange}
            disabled={!isIdle}
          />
        </div>

        <div className="flex items-center gap-2 rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 shrink-0 text-[#F39C12]" />
          Оценку можно оставить пустой и поставить позже в карточке тайтла.
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={state === 'loading'}
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={!isIdle}
            className="gap-1.5"
          >
            {state === 'loading' ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
