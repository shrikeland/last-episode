'use server'

import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { createMediaItem } from '@/lib/supabase/media'
import { createSeasonsAndEpisodes } from '@/lib/supabase/progress'
import { fetchAndApplyFillers } from '@/lib/filler/filler.service'
import { getMovieDetails, getTVDetails, getBasicInfo, getCredits, buildPosterUrl } from '@/lib/tmdb/tmdb.service'
import type { CreateMediaItemOptions, MediaStatus, MediaType, TmdbSeason } from '@/types'
import type { RecommendationDetails } from '@/types/recommendations'

const VALID_STATUSES = new Set<MediaStatus>(['watching', 'completed', 'planned', 'dropped', 'on_hold'])

function isValidRating(rating: CreateMediaItemOptions['rating']): boolean {
  if (rating === null || rating === undefined) return true
  return (
    Number.isFinite(rating) &&
    rating >= 0.5 &&
    rating <= 10 &&
    rating * 2 === Math.trunc(rating * 2)
  )
}

function hasPlannedSeasons(seasons: TmdbSeason[] | undefined): boolean {
  return (seasons ?? []).some((season) => {
    return season.episode_count === 0 || season.episode_count > season.episodes.length
  })
}

function normalizeOptions(options?: CreateMediaItemOptions): CreateMediaItemOptions | undefined {
  if (!options) return undefined
  return {
    status: options.status && VALID_STATUSES.has(options.status) ? options.status : undefined,
    rating: options.rating ?? null,
  }
}

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
  type: MediaType,
  options?: CreateMediaItemOptions
): Promise<{
  success?: boolean
  error?: 'already_exists' | 'auth' | 'tmdb' | 'db_error' | 'invalid_rating' | 'planned_seasons'
}> {
  if (!isValidRating(options?.rating)) {
    return { error: 'invalid_rating' }
  }
  const safeOptions = normalizeOptions(options)

  const user = await getServerUser()
  if (!user) return { error: 'auth' }

  const supabase = await createServerClient()

  try {
    const details =
      (type === 'movie' || type === 'animation')
        ? await getMovieDetails(tmdbId, type as 'movie' | 'animation')
        : await getTVDetails(tmdbId, type)

    if (
      safeOptions?.status === 'completed' &&
      (type === 'tv' || type === 'anime') &&
      hasPlannedSeasons(details.seasons)
    ) {
      return { error: 'planned_seasons' }
    }

    const result = await createMediaItem(supabase, user.id, details, safeOptions)
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
