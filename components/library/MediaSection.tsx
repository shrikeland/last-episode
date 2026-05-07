'use client'

import { MediaRow } from './MediaRow'
import { MEDIA_TYPE_LABELS } from '@/types'
import type { MediaItem, MediaType, EpisodeProgress } from '@/types'
import { useTheme } from '@/contexts/ThemeContext'

const TYPE_SVG: Record<MediaType, (accent: string) => React.ReactNode> = {
  anime: (accent) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
    </svg>
  ),
  movie: (accent) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.5"/>
      <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/>
      <line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/>
    </svg>
  ),
  tv: (accent) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="15" rx="2"/>
      <polyline points="17 2 12 7 7 2"/>
    </svg>
  ),
  animation: (accent) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10,8 16,12 10,16"/>
    </svg>
  ),
}

interface MediaSectionProps {
  type: MediaType
  items: MediaItem[]
  progressMap: Record<string, EpisodeProgress>
}

export function MediaSection({ type, items, progressMap }: MediaSectionProps) {
  const { accent } = useTheme()
  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="flex items-center">{TYPE_SVG[type]?.(accent)}</span>
        <h2
          className="text-xs font-bold tracking-[0.12em] uppercase"
          style={{ color: 'hsl(210 100% 93%)' }}
        >
          {MEDIA_TYPE_LABELS[type]}
        </h2>
        <span
          className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-full border"
          style={{
            background: 'hsl(213 50% 8%)',
            borderColor: 'hsl(213 44% 16%)',
            color: 'hsl(210 14% 50%)',
          }}
        >
          {items.length}
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: 'linear-gradient(90deg, hsl(213 44% 20%) 0%, transparent 100%)' }}
        />
      </div>
      <MediaRow items={items} progressMap={progressMap} />
    </div>
  )
}