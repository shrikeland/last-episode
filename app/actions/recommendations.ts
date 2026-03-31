'use server'

import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { createMediaItem } from '@/lib/supabase/media'
import { createSeasonsAndEpisodes } from '@/lib/supabase/progress'
import { fetchAndApplyFillers } from '@/lib/filler/filler.service'
import { getMovieDetails, getTVDetails, getBasicInfo, getCredits, buildPosterUrl } from '@/lib/tmdb/tmdb.service'
import type { MediaType } from '@/types'
import type { RecommendationDetails } from '@/types/recommendations'

function pluralSeasons(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'сезон'
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'сезона'
  return 'сезонов'
}

export async function getRecommendationDetails(
  tmdbId: number,
  type: string,
  reason: string
): Promise<{ data?: RecommendationDetails; error?: string }> {
  const mediaType = (type === 'movie' || type === 'animation') ? 'movie' : 'tv'
  try {
    const [info, credits] = await Promise.all([
      getBasicInfo(tmdbId, mediaType),
      getCredits(tmdbId, mediaType),
    ])

    let runtime: string | null = null
    if (mediaType === 'movie' && info.runtimeMinutes) {
      runtime = `${info.runtimeMinutes} мин`
    } else if (mediaType === 'tv' && info.seasonCount) {
      runtime = `${info.seasonCount} ${pluralSeasons(info.seasonCount)}`
    }

    return {
      data: {
        title: info.title,
        year: info.releaseYear,
        type,
        posterUrl: info.posterPath ? buildPosterUrl(info.posterPath) : null,
        overview: info.overview,
        genres: info.genres,
        voteAverage: info.voteAverage,
        voteCount: info.voteCount,
        runtime,
        director: credits.director,
        cast: credits.cast,
        reason,
      },
    }
  } catch {
    return { error: 'tmdb' }
  }
}

export async function addRecommendedTitle(
  tmdbId: number,
  type: MediaType
): Promise<{ success?: boolean; error?: 'already_exists' | 'auth' | 'tmdb' | 'db_error' }> {
  const user = await getServerUser()
  if (!user) return { error: 'auth' }

  const supabase = await createServerClient()

  try {
    const details =
      (type === 'movie' || type === 'animation')
        ? await getMovieDetails(tmdbId, type as 'movie' | 'animation')
        : await getTVDetails(tmdbId, type)

    const result = await createMediaItem(supabase, user.id, details)
    if (result.error) return { error: result.error }

    if ((type === 'tv' || type === 'anime') && details.seasons?.length && result.item) {
      await createSeasonsAndEpisodes(supabase, result.item.id, details.seasons)

      if (type === 'anime') {
        void fetchAndApplyFillers(
          result.item.id,
          details.tmdb_id,
          details.title,
          details.original_title,
          details.seasons
        )
      }
    }

    return { success: true }
  } catch {
    return { error: 'tmdb' }
  }
}
