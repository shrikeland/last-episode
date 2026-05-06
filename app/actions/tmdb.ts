'use server'

import * as TmdbService from '@/lib/tmdb/tmdb.service'
import * as MediaService from '@/lib/supabase/media'
import { createSeasonsAndEpisodes } from '@/lib/supabase/progress'
import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { fetchAndApplyFillers } from '@/lib/filler/filler.service'
import type { CreateMediaItemOptions, TmdbSearchResult, MediaType, TmdbSeason } from '@/types'

const VALID_STATUSES = new Set(['watching', 'completed', 'planned', 'dropped', 'on_hold'])

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

export async function getLibraryTmdbIds(tmdbIds: number[]): Promise<number[]> {
  if (!tmdbIds.length) return []
  const user = await getServerUser()
  if (!user) return []

  const supabase = await createServerClient()

  const { data } = await supabase
    .from('media_items')
    .select('tmdb_id')
    .eq('user_id', user.id)
    .in('tmdb_id', tmdbIds)

  return (data ?? []).map((row) => row.tmdb_id as number)
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  try {
    return await TmdbService.search(query)
  } catch {
    return []
  }
}

export async function addMediaItem(
  tmdbId: number,
  type: MediaType,
  options?: CreateMediaItemOptions
): Promise<{
  success: boolean
  error?: 'already_exists' | 'tmdb_error' | 'db_error' | 'invalid_rating'
    | 'planned_seasons'
}> {
  if (!isValidRating(options?.rating)) {
    return { success: false, error: 'invalid_rating' }
  }
  const safeOptions = normalizeOptions(options)

  const user = await getServerUser()
  if (!user) return { success: false, error: 'db_error' }

  const supabase = await createServerClient()

  let details
  try {
    if (type === 'movie' || type === 'animation') {
      details = await TmdbService.getMovieDetails(tmdbId, type)
    } else {
      details = await TmdbService.getTVDetails(tmdbId, type)
    }
  } catch {
    return { success: false, error: 'tmdb_error' }
  }

  if (
    safeOptions?.status === 'completed' &&
    (type === 'tv' || type === 'anime') &&
    hasPlannedSeasons(details.seasons)
  ) {
    return { success: false, error: 'planned_seasons' }
  }

  const result = await MediaService.createMediaItem(supabase, user.id, details, safeOptions)
  if (result.error) return { success: false, error: result.error }

  if ((type === 'tv' || type === 'anime') && details.seasons?.length && result.item) {
    await createSeasonsAndEpisodes(supabase, result.item.id, details.seasons)

    if (type === 'anime') {
      // fire-and-forget — не блокирует ответ пользователю
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
}
