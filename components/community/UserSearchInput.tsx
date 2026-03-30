'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { UserCard } from '@/components/community/UserCard'
import { searchUsers } from '@/app/actions/users'
import type { Profile } from '@/types'

interface UserSearchInputProps {
  recentUsers: Profile[]
}

export function UserSearchInput({ recentUsers }: UserSearchInputProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const data = await searchUsers(query)
        setResults(data)
        setSearched(true)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const showRecent = !query.trim()

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти пользователя по логину..."
          className="pl-9"
          autoFocus
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {showRecent && recentUsers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Новые пользователи</p>
          {recentUsers.map((profile) => (
            <UserCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}

      {!showRecent && searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Пользователи не найдены
        </p>
      )}

      {!showRecent && results.length > 0 && (
        <div className="space-y-2">
          {results.map((profile) => (
            <UserCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  )
}
