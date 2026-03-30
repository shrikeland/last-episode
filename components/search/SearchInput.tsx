'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'
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

  const handleChange = (value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!value.trim()) {
      setResults([])
      setLibraryIds(new Set())
      setSearched(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await searchTmdb(value)
        const ids = await getLibraryTmdbIds(data.map((r) => r.tmdb_id))
        setLibraryIds(new Set(ids))
        setResults(data)
        setSearched(true)
      } finally {
        setIsLoading(false)
      }
    }, 400)
  }

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
          className="pl-9 h-12 text-base"
          autoFocus
          data-testid="search-input"
        />
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