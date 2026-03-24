'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'
import { searchTmdb } from '@/app/actions/tmdb'
import { TmdbResultCard } from './TmdbResultCard'
import type { TmdbSearchResult } from '@/types'

export function SearchInput() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!value.trim()) {
      setResults([])
      setSearched(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await searchTmdb(value)
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
        {isLoading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
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
            <TmdbResultCard key={result.tmdb_id} result={result} />
          ))}
        </div>
      )}
    </div>
  )
}