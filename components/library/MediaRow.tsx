'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MediaCard } from './MediaCard'
import type { MediaItem, EpisodeProgress } from '@/types'

interface MediaRowProps {
  items: MediaItem[]
  progressMap: Record<string, EpisodeProgress>
}

export function MediaRow({ items, progressMap }: MediaRowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = containerRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -(el.clientWidth * 0.8) : el.clientWidth * 0.8, behavior: 'smooth' })
  }, [])

  return (
    <div className="relative group/row">
      {/* Left fade overlay */}
      <div
        className="absolute left-0 top-0 bottom-2 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-200"
        style={{ opacity: canScrollLeft ? 1 : 0 }}
      />
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        aria-label="Прокрутить влево"
        className={[
          'absolute left-0 top-[45%] -translate-y-1/2 -translate-x-3 z-20',
          'h-9 w-9 flex items-center justify-center',
          'rounded-full bg-background border border-border shadow-lg',
          'transition-all duration-200',
          'opacity-0 group-hover/row:opacity-100',
          canScrollLeft ? 'pointer-events-auto' : 'pointer-events-none invisible',
        ].join(' ')}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Scrollable row */}
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
      >
        {items.map((item, i) => (
          <div key={item.id} className="flex-shrink-0 w-[140px] sm:w-[152px]">
            <MediaCard item={item} index={i} progress={progressMap[item.id]} />
          </div>
        ))}
      </div>

      {/* Right fade overlay */}
      <div
        className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-200"
        style={{ opacity: canScrollRight ? 1 : 0 }}
      />
      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        aria-label="Прокрутить вправо"
        className={[
          'absolute right-0 top-[45%] -translate-y-1/2 translate-x-3 z-20',
          'h-9 w-9 flex items-center justify-center',
          'rounded-full bg-background border border-border shadow-lg',
          'transition-all duration-200',
          'opacity-0 group-hover/row:opacity-100',
          canScrollRight ? 'pointer-events-auto' : 'pointer-events-none invisible',
        ].join(' ')}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
