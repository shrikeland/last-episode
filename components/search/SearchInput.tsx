'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, X } from 'lucide-react'
import { searchTitles } from '@/app/actions/tmdb'
import { mediaTitleKey } from '@/lib/tmdb/kind'
import { TmdbResultCard } from './TmdbResultCard'
import type { TmdbSearchResult } from '@/types'

// Одна буква даёт TMDB шум, а не выдачу
const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 400

/**
 * Запрос живёт в ?q=, чтобы «Назад» с карточки тайтла возвращал выдачу.
 * history.replaceState Next 16 синхронизирует с роутером без запроса к серверу.
 */
function syncQueryToUrl(value: string) {
  const url = new URL(window.location.href)
  const trimmed = value.trim()
  if (trimmed) url.searchParams.set('q', trimmed)
  else url.searchParams.delete('q')
  window.history.replaceState(null, '', url)
}

export function SearchInput({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [libraryKeys, setLibraryKeys] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  async function runSearch(value: string, requestId: number) {
    setIsLoading(true)
    try {
      const { results: data, libraryKeys: keys } = await searchTitles(value)
      if (requestId !== requestIdRef.current) return
      setLibraryKeys(new Set(keys))
      setResults(data)
      setSearched(true)
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }

  // Вернулись на /search?q=… — сразу показываем выдачу, без ожидания debounce
  useEffect(() => {
    if (initialQuery.trim().length < MIN_QUERY_LENGTH) return
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    void runSearch(initialQuery, requestId)
    // Только при монтировании: дальше запрос ведёт handleChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    syncQueryToUrl(value)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (value.trim().length < MIN_QUERY_LENGTH) {
      setResults([])
      setLibraryKeys(new Set())
      setSearched(false)
      setIsLoading(false)
      requestIdRef.current += 1
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    timerRef.current = setTimeout(() => void runSearch(value, requestId), DEBOUNCE_MS)
  }

  const handleClear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    requestIdRef.current += 1
    setQuery('')
    syncQueryToUrl('')
    setResults([])
    setLibraryKeys(new Set())
    setSearched(false)
    setIsLoading(false)
  }

  const canClear = query.length > 0 || results.length > 0 || searched

  return (
    <div className="space-y-4">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-[#E67E22] animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
        <Input
          placeholder="Название фильма, сериала или аниме..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-9 pr-11 h-12 text-base"
          autoFocus
          data-testid="search-input"
        />
        {canClear && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Очистить поиск"
            onClick={handleClear}
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {searched && results.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground py-8">
          Ничего не найдено по запросу «{query}»
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => {
            // /search/multi может вернуть фильм и сериал с одинаковым tmdb_id
            const titleKey = mediaTitleKey(result.type, result.tmdb_id)
            return (
              <TmdbResultCard
                key={titleKey}
                result={result}
                initialAdded={libraryKeys.has(titleKey)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
