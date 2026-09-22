import { createServerClient, getServerUser } from '@/lib/supabase/server'
import Link from 'next/link'
import { getMediaItems, getEpisodeProgressMap, getLibraryGenres } from '@/lib/supabase/media'
import { FilterBar } from '@/components/library/FilterBarNoSSR'
import { LibrarySections } from '@/components/library/LibrarySections'
import { MEDIA_TYPE_LABELS } from '@/types'
import type { MediaFilters, SortOptions, MediaStatus, MediaType, SortField, SortDirection } from '@/types'

interface SearchParams {
  search?: string
  status?: string
  type?: string
  genre?: string
  rating?: string
  sort?: string
  dir?: string
}

export const dynamic = 'force-dynamic'

// rating в URL: '8' | '6' → минимальная оценка, 'none' → только без оценки
function parseRating(rating?: string): Pick<MediaFilters, 'minRating' | 'unrated'> {
  if (rating === 'none') return { unrated: true }
  if (rating === '8' || rating === '6') return { minRating: Number(rating) }
  return {}
}

function isMediaType(type?: string): type is MediaType {
  return !!type && type in MEDIA_TYPE_LABELS
}

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
    type: isMediaType(params.type) ? params.type : 'all',
    genre: params.genre || undefined,
    ...parseRating(params.rating),
  }

  const sort: SortOptions = {
    field: (params.sort as SortField) || 'release_year',
    direction: (params.dir as SortDirection) || 'desc',
  }

  const [items, { genres, total }] = await Promise.all([
    getMediaItems(supabase, user.id, filters, sort),
    getLibraryGenres(supabase, user.id),
  ])

  const nonMovieIds = items.filter((i) => i.type !== 'movie').map((i) => i.id)
  const progressMap = await getEpisodeProgressMap(supabase, nonMovieIds)

  const hasFilters = !!(
    params.search ||
    (params.status && params.status !== 'all') ||
    isMediaType(params.type) ||
    params.genre ||
    params.rating
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">Библиотека</h1>
        </div>
        <p className="text-sm text-muted-foreground">{total} тайтлов в коллекции</p>
      </div>
      <div className="space-y-3">
        <FilterBar currentFilters={params} genres={genres} />
        {hasFilters && (
          <p className="text-sm text-muted-foreground" data-testid="library-found-count">
            Найдено: {items.length}
            <span className="mx-2">·</span>
            <Link href="/library" className="text-[#E67E22] hover:text-[#F39C12] transition-colors">
              Сбросить
            </Link>
          </p>
        )}
      </div>
      <LibrarySections items={items} hasFilters={hasFilters} progressMap={progressMap} />
    </div>
  )
}