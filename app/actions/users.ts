'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getMediaItems } from '@/lib/supabase/media'
import { computeStats } from '@/lib/stats'
import type { EpisodeForStats } from '@/lib/stats'
import type { Profile, MediaItem, MediaType } from '@/types'

export async function getRecentUsers(limit = 5): Promise<Profile[]> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as Profile[]
}

export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query.trim()) return []

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query.trim()}%`)
    .limit(20)

  if (error) return []
  return (data ?? []) as Profile[]
}

export async function getUserProfile(username: string): Promise<{
  profile: Profile
  mediaItems: MediaItem[]
  stats: Awaited<ReturnType<typeof computeStats>>
} | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Получаем профиль (доступен всем авторизованным через RLS)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (profileError || !profile) return null

  const typedProfile = profile as Profile

  if (!typedProfile.is_library_public) {
    return { profile: typedProfile, mediaItems: [], stats: computeStats([], []) }
  }

  // Для чтения чужих медиа используем service role (обходит RLS)
  const service = createServiceClient()
  const mediaItems = await getMediaItems(service, typedProfile.id)

  // Считаем статистику
  const tvAnimeIds = mediaItems.filter((i) => i.type !== 'movie').map((i) => i.id)
  let watchedEpisodes: EpisodeForStats[] = []

  if (tvAnimeIds.length > 0) {
    const { data: seasons } = await service
      .from('seasons')
      .select('id, media_item_id')
      .in('media_item_id', tvAnimeIds)

    if (seasons && seasons.length > 0) {
      const mediaItemTypeMap = new Map<string, MediaType>(
        mediaItems.map((i) => [i.id, i.type])
      )
      const seasonToMediaItem = new Map<string, string>(
        (seasons as { id: string; media_item_id: string }[]).map((s) => [s.id, s.media_item_id])
      )
      const seasonIds = (seasons as { id: string }[]).map((s) => s.id)

      const { data: episodes } = await service
        .from('episodes')
        .select('runtime_minutes, season_id')
        .eq('is_watched', true)
        .in('season_id', seasonIds)

      if (episodes) {
        watchedEpisodes = (episodes as { runtime_minutes: number | null; season_id: string }[]).map(
          (ep) => ({
            runtime_minutes: ep.runtime_minutes,
            media_type: mediaItemTypeMap.get(seasonToMediaItem.get(ep.season_id) ?? '') ?? 'tv',
          })
        )
      }
    }
  }

  const stats = computeStats(mediaItems, watchedEpisodes)
  return { profile: typedProfile, mediaItems, stats }
}