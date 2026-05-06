'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateStatus } from '@/app/actions/progress'
import { MEDIA_STATUS_LABELS } from '@/types'
import type { MediaStatus, MediaType } from '@/types'

const STATUS_COLORS: Record<MediaStatus, string> = {
  watching: 'text-blue-400',
  completed: 'text-green-400',
  planned: 'text-muted-foreground',
  dropped: 'text-red-400',
  on_hold: 'text-yellow-400',
}

interface StatusSelectProps {
  mediaItemId: string
  currentStatus: MediaStatus
  mediaType: MediaType
}

export function StatusSelect({ mediaItemId, currentStatus, mediaType }: StatusSelectProps) {
  const [status, setStatus] = useState<MediaStatus>(currentStatus)
  const [, startTransition] = useTransition()

  function handleChange(value: string) {
    const newStatus = value as MediaStatus
    const previousStatus = status
    setStatus(newStatus)
    startTransition(async () => {
      try {
        const result = await updateStatus(mediaItemId, newStatus, mediaType)
        if (!result.success && result.error === 'planned_seasons') {
          setStatus((current) => current === newStatus ? previousStatus : current)
          toast.error('Нельзя отметить просмотренным: есть запланированные сезоны')
        }
      } catch {
        setStatus((current) => current === newStatus ? previousStatus : current)
        toast.error('Ошибка сохранения статуса')
      }
    })
  }

  return (
    <Select value={status} onValueChange={handleChange}>
      <SelectTrigger
        className="w-[180px]"
        data-testid="status-select"
      >
        <SelectValue>
          <span className={STATUS_COLORS[status]}>
            {MEDIA_STATUS_LABELS[status]}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(MEDIA_STATUS_LABELS) as MediaStatus[]).map((s) => (
          <SelectItem key={s} value={s}>
            <span className={STATUS_COLORS[s]}>{MEDIA_STATUS_LABELS[s]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
