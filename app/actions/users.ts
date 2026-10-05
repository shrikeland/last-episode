'use server'

import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getMediaItems } from '@/lib/supabase/media'
import { getWatchedMinutes } from '@/lib/supabase/progress'
import { computeStats } from '@/lib/stats'
import type { EpisodeForStats } from '@/lib/stats'
import type { Profile, MediaItem } from '@/types'

export async function getRecentUsers(limit = 5): Promise<Profile[]> {
  const user = await getServerUser()
  if (!user) return []

  const supabase = await createServerClient()

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

  const user = await getServerUser()
  if (!user) return []

  const supabase = await createServerClient()

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
  const user = await getServerUser()
  if (!user) return null

  const supabase = await createServerClient()

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

  // Считаем статистику: минуты сериалов и аниме — агрегатом в БД, без выгрузки серий
  const tvAnimeItems = mediaItems.filter((i) => i.type !== 'movie')
  const minutesByItem = await getWatchedMinutes(
    service,
    tvAnimeItems.map((i) => i.id)
  )
  const watchedEpisodes: EpisodeForStats[] = tvAnimeItems.map((i) => ({
    runtime_minutes: minutesByItem.get(i.id) ?? 0,
    media_type: i.type,
  }))

  const stats = computeStats(mediaItems, watchedEpisodes)
  return { profile: typedProfile, mediaItems, stats }
}