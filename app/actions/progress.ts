'use server'

import * as ProgressService from '@/lib/supabase/progress'
import * as MediaService from '@/lib/supabase/media'
import { createServerClient, getServerUser } from '@/lib/supabase/server'
import type { MediaStatus, MediaType } from '@/types'

export async function toggleEpisode(
  episodeId: string,
  isWatched: boolean
): Promise<void> {
  const supabase = await createServerClient()
  await ProgressService.toggleEpisodeWatched(supabase, episodeId, isWatched)
}

export async function markSeason(
  seasonId: string,
  isWatched: boolean
): Promise<void> {
  const supabase = await createServerClient()
  await ProgressService.markSeasonWatched(supabase, seasonId, isWatched)
}

export async function markAllTitle(
  mediaItemId: string,
  isWatched: boolean
): Promise<void> {
  const supabase = await createServerClient()
  if (isWatched) {
    await ProgressService.markAllEpisodesWatched(supabase, mediaItemId)
  } else {
    await ProgressService.markAllEpisodesUnwatched(supabase, mediaItemId)
  }
}

export async function updateStatus(
  mediaItemId: string,
  status: MediaStatus,
  mediaType: MediaType
): Promise<void> {
  const user = await getServerUser()
  if (!user) return

  const supabase = await createServerClient()

  await MediaService.updateMediaItem(supabase, mediaItemId, user.id, { status })

  if (status === 'completed' && mediaType !== 'movie') {
    await ProgressService.markAllEpisodesWatched(supabase, mediaItemId)
  }
}

export async function updateRating(
  mediaItemId: string,
  rating: number | null
): Promise<void> {
  const user = await getServerUser()
  if (!user) return

  const supabase = await createServerClient()

  await MediaService.updateMediaItem(supabase, mediaItemId, user.id, { rating })
}

export async function updateNotes(
  mediaItemId: string,
  notes: string | null
): Promise<void> {
  const user = await getServerUser()
  if (!user) return

  const supabase = await createServerClient()

  await MediaService.updateMediaItem(supabase, mediaItemId, user.id, { notes })
}