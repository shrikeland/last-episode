'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react'
import type { TmdbCastMember } from '@/lib/tmdb/tmdb.service'

interface CastListProps {
  cast: TmdbCastMember[]
}

export function CastList({ cast }: CastListProps) {
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
    el.scrollBy({
      left: dir === 'left' ? -(el.clientWidth * 0.8) : el.clientWidth * 0.8,
      behavior: 'smooth',
    })
  }, [])

  if (cast.length === 0) return null

  return (
    <section className="min-w-0 max-w-full space-y-3" aria-labelledby="cast-heading">
      <h2
        id="cast-heading"
        className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
      >
        Актерский состав
      </h2>
      <div className="relative max-w-full overflow-hidden group/cast">
        <div
          className="absolute left-0 top-0 bottom-2 w-14 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-200"
          style={{ opacity: canScrollLeft ? 1 : 0 }}
        />
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Прокрутить актеров влево"
          className={[
            'absolute left-0 top-[45%] -translate-y-1/2 -translate-x-2 z-20',
            'h-9 w-9 flex items-center justify-center rounded-full',
            'bg-background border border-border shadow-lg transition-all duration-200',
            'opacity-0 group-hover/cast:opacity-100',
            canScrollLeft ? 'pointer-events-auto' : 'pointer-events-none invisible',
          ].join(' ')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={containerRef}
          className="flex max-w-full gap-3 overflow-x-auto pb-2 scrollbar-hide"
        >
          {cast.map((member) => (
            <article
              key={`${member.id}-${member.character}`}
              className="w-[124px] shrink-0 overflow-hidden rounded-lg border border-border/50 bg-card/80 sm:w-[132px]"
            >
              <div className="relative aspect-[2/3] bg-secondary">
                {member.profile_url ? (
                  <Image
                    src={member.profile_url}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="132px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <UserRound className="h-10 w-10 text-muted-foreground/35" />
                  </div>
                )}
              </div>
              <div className="space-y-1 p-2.5">
                <h3 className="line-clamp-2 text-sm font-medium leading-tight">
                  {member.name}
                </h3>
                {member.character && (
                  <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {member.character}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        <div
          className="absolute right-0 top-0 bottom-2 w-14 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-200"
          style={{ opacity: canScrollRight ? 1 : 0 }}
        />
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Прокрутить актеров вправо"
          className={[
            'absolute right-0 top-[45%] -translate-y-1/2 translate-x-2 z-20',
            'h-9 w-9 flex items-center justify-center rounded-full',
            'bg-background border border-border shadow-lg transition-all duration-200',
            'opacity-0 group-hover/cast:opacity-100',
            canScrollRight ? 'pointer-events-auto' : 'pointer-events-none invisible',
          ].join(' ')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
