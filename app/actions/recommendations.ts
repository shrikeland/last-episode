'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createMediaItem } from '@/lib/supabase/media'
import { getMovieDetails, getTVDetails } from '@/lib/tmdb/tmdb.service'
import type { MediaType } from '@/types'

export async function addRecommendedTitle(
  tmdbId: number,
  type: MediaType
): Promise<{ success?: boolean; error?: 'already_exists' | 'auth' | 'tmdb' | 'db_error' }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'auth' }

  try {
    const details =
      type === 'movie'
        ? await getMovieDetails(tmdbId)
        : await getTVDetails(tmdbId, type)

    const result = await createMediaItem(supabase, user.id, details)
    if (result.error) return { error: result.error }
    return { success: true }
  } catch {
    return { error: 'tmdb' }
  }
}
