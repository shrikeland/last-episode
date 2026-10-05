'use client'

import nextDynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { FilterBar as FilterBarType } from './FilterBar'

// Те же контролы и размеры, что у FilterBar: пока грузится его чанк, сетка не прыгает вниз.
// Классы продублированы намеренно — импорт SELECT_WIDTH из FilterBar затянул бы его в этот чанк
function FilterBarSkeleton() {
  const block = 'h-10 rounded-md border border-input bg-background'
  const select = `${block} w-[calc(50%-6px)] sm:w-[160px]`
  return (
    <div className="flex flex-wrap gap-3" aria-hidden>
      <div className={`${block} flex-1 min-w-[200px]`} />
      <div className={select} />
      <div className={select} />
      <div className={select} />
      <div className={select} />
      <div className={`${block} w-full sm:w-[200px]`} />
    </div>
  )
}

const FilterBarDynamic = nextDynamic(
  () => import('./FilterBar').then((m) => m.FilterBar),
  { ssr: false, loading: FilterBarSkeleton }
)

export function FilterBar(props: ComponentProps<typeof FilterBarType>) {
  return <FilterBarDynamic {...props} />
}
