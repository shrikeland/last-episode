'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, X } from 'lucide-react'
import { searchTmdb, getLibraryTmdbIds } from '@/app/actions/tmdb'
import { TmdbResultCard } from './TmdbResultCard'
import type { TmdbSearchResult } from '@/types'

export function SearchInput() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [libraryIds, setLibraryIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  const handleChange = (value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!value.trim()) {
      setResults([])
      setLibraryIds(new Set())
      setSearched(false)
      setIsLoading(false)
      requestIdRef.current += 1
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    timerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await searchTmdb(value)
        const ids = await getLibraryTmdbIds(data.map((r) => r.tmdb_id))
        if (requestId !== requestIdRef.current) return
        setLibraryIds(new Set(ids))
        setResults(data)
        setSearched(true)
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }, 400)
  }

  const handleClear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    requestIdRef.current += 1
    setQuery('')
    setResults([])
    setLibraryIds(new Set())
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
          {results.map((result) => (
            <TmdbResultCard
              key={result.tmdb_id}
              result={result}
              initialAdded={libraryIds.has(result.tmdb_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
