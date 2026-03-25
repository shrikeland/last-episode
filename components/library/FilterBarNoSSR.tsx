'use client'

import nextDynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { FilterBar as FilterBarType } from './FilterBar'

const FilterBarDynamic = nextDynamic(
  () => import('./FilterBar').then((m) => m.FilterBar),
  { ssr: false }
)

export function FilterBar(props: ComponentProps<typeof FilterBarType>) {
  return <FilterBarDynamic {...props} />
}