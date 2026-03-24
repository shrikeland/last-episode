'use client'

import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { MEDIA_STATUS_LABELS } from '@/types'
import type { MediaStatus } from '@/types'

interface FilterBarProps {
  currentFilters: {
    search?: string
    status?: string
    type?: string
    genre?: string
    sort?: string
    dir?: string
  }
}

export function FilterBar({ currentFilters }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(currentFilters.search ?? '')
  const filtersRef = useRef(currentFilters)
  const mountedRef = useRef(false)

  // Sync search input when filters are reset externally (e.g. "Сбросить фильтры")
  useEffect(() => {
    setSearch(currentFilters.search ?? '')
  }, [currentFilters.search])
  useEffect(() => { filtersRef.current = currentFilters }, [currentFilters])
  useLayoutEffect(() => { mountedRef.current = true }, [])

  const updateUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams()
      const merged = { ...filtersRef.current, ...updates }
      for (const [k, v] of Object.entries(merged)) {
        if (v && v !== 'all') params.set(k, v)
      }
      router.replace(`${pathname}?${params.toString()}`)
    },
    [pathname, router]
  )

  // Debounce поиска — пропускаем первый рендер
  useEffect(() => {
    if (!mountedRef.current) return
    const timer = setTimeout(() => {
      updateUrl({ search })
    }, 400)
    return () => clearTimeout(timer)
  }, [search, updateUrl])

  return (
    <div className="flex flex-wrap gap-3">
      {/* Поиск */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Статус */}
      <Select
        value={currentFilters.status ?? 'all'}
        onValueChange={(v) => updateUrl({ status: v })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          {(Object.keys(MEDIA_STATUS_LABELS) as MediaStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {MEDIA_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Сортировка */}
      <Select
        value={`${currentFilters.sort ?? 'created_at'}_${currentFilters.dir ?? 'desc'}`}
        onValueChange={(v) => {
          const lastUnderscore = v.lastIndexOf('_')
          const field = v.slice(0, lastUnderscore)
          const dir = v.slice(lastUnderscore + 1)
          updateUrl({ sort: field, dir })
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Сортировка" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at_desc">Новые сначала</SelectItem>
          <SelectItem value="created_at_asc">Старые сначала</SelectItem>
          <SelectItem value="title_asc">По названию А–Я</SelectItem>
          <SelectItem value="title_desc">По названию Я–А</SelectItem>
          <SelectItem value="rating_desc">По оценке ↓</SelectItem>
          <SelectItem value="rating_asc">По оценке ↑</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}