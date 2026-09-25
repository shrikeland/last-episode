// Серверные секции страницы тайтла. Каждая грузит свои данные сама и рендерится
// в своём <Suspense>, поэтому шапка тайтла показывается сразу, не дожидаясь TMDB и синка сезонов
import { createServerClient } from '@/lib/supabase/server'
import { getSeasonsWithEpisodes, syncSeasonsAndEpisodes } from '@/lib/supabase/progress'
import { getFriendsWithTitle } from '@/lib/supabase/friends'
import { buildPosterUrl, getRelatedTitles, getTopCast, getTVDetails } from '@/lib/tmdb/tmdb.service'
import { getLibraryItemIds } from '@/app/actions/tmdb'
import { CastList } from '@/components/media/CastList'
import { FriendsOnTitle } from '@/components/media/FriendsOnTitle'
import { SeasonAccordion } from '@/components/media/SeasonAccordion'
import { TitleRecommendations, type TitleRecommendationItem } from '@/components/media/TitleRecommendations'
import type { MediaItem, SeasonWithEpisodes } from '@/types'

export async function CastSection({ tmdbId, isSeries }: { tmdbId: number; isSeries: boolean }) {
  const cast = await getTopCast(tmdbId, isSeries ? 'tv' : 'movie')
  return <CastList cast={cast} />
}

export async function FriendsSection({ userId, item }: { userId: string; item: MediaItem }) {
  const supabase = await createServerClient()
  const entries = await getFriendsWithTitle(supabase, userId, item.tmdb_kind, item.tmdb_id)
  return <FriendsOnTitle entries={entries} />
}

export async function RecommendationsSection({ item }: { item: MediaItem }) {
  const related = await getRelatedTitles(item.tmdb_id, item.type)
  const libraryItemIds = await getLibraryItemIds(
    related.map((relatedItem) => ({ tmdbId: relatedItem.tmdb_id, type: relatedItem.type }))
  )
  const items: TitleRecommendationItem[] = related.map((relatedItem) => ({
    tmdbId: relatedItem.tmdb_id,
    title: relatedItem.title,
    type: relatedItem.type,
    posterUrl: buildPosterUrl(relatedItem.poster_path),
    releaseYear: relatedItem.release_year,
    overview: relatedItem.overview,
    source: relatedItem.source,
  }))

  return <TitleRecommendations items={items} libraryItemIds={libraryItemIds} />
}

/**
 * Сезоны из БД и TMDB читаем параллельно, затем пишем только разницу (обычно ничего).
 * Ошибка TMDB или синка не ломает секцию — показываем то, что уже есть в БД.
 */
async function loadSeasons(item: MediaItem): Promise<SeasonWithEpisodes[]> {
  const supabase = await createServerClient()
  const [stored, details] = await Promise.all([
    getSeasonsWithEpisodes(supabase, item.id),
    getTVDetails(item.tmdb_id, item.type).catch((error) => {
      console.error('[media/tv-details]', error)
      return null
    }),
  ])

  if (!details?.seasons?.length) return stored

  try {
    const changed = await syncSeasonsAndEpisodes(
      supabase,
      item.id,
      details.seasons,
      stored,
      item.status === 'completed'
    )
    return changed ? await getSeasonsWithEpisodes(supabase, item.id) : stored
  } catch (error) {
    console.error('[media/sync-seasons]', error)
    return stored
  }
}

export async function SeasonsSection({ item }: { item: MediaItem }) {
  const seasons = await loadSeasons(item)
  if (seasons.length === 0) return null

  return (
    <SeasonAccordion
      seasons={seasons}
      mediaItemId={item.id}
      mediaType={item.type}
      status={item.status}
    />
  )
}

export function SectionSkeleton({ className = 'h-32' }: { className?: string }) {
  return <div className={`${className} bg-muted/20 animate-pulse rounded-lg`} />
}
