import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { getMediaItems, getEpisodeProgressMap } from '@/lib/supabase/media'
import { FilterBar } from '@/components/library/FilterBarNoSSR'
import { LibrarySections } from '@/components/library/LibrarySections'
import type { MediaFilters, SortOptions, MediaStatus, SortField, SortDirection } from '@/types'

interface SearchParams {
  search?: string
  status?: string
  type?: string
  genre?: string
  sort?: string
  dir?: string
}

export const dynamic = 'force-dynamic'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const user = await getServerUser()
  if (!user) return null

  const supabase = await createServerClient()

  const filters: MediaFilters = {
    search: params.search || undefined,
    status: (params.status as MediaStatus | 'all') || 'all',
    genre: params.genre || undefined,
  }

  const sort: SortOptions = {
    field: (params.sort as SortField) || 'release_year',
    direction: (params.dir as SortDirection) || 'desc',
  }

  const items = await getMediaItems(supabase, user.id, filters, sort)

  const nonMovieIds = items.filter((i) => i.type !== 'movie').map((i) => i.id)
  const progressMap = await getEpisodeProgressMap(supabase, nonMovieIds)

  const hasFilters = !!(params.search || (params.status && params.status !== 'all'))

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">Библиотека</h1>
        </div>
        <p className="text-sm text-muted-foreground">{items.length} тайтлов в коллекции</p>
      </div>
      <FilterBar currentFilters={params} />
      <LibrarySections items={items} hasFilters={hasFilters} progressMap={progressMap} />
    </div>
  )
}