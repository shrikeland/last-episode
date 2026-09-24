'use server'

import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { getMediaItems } from '@/lib/supabase/media'
import type { MediaItem } from '@/types'

type FriendshipIds = { user_id: string; friend_id: string }

/**
 * Всё, что нужно профилю друга для блока «Что у нас общего», со стороны смотрящего:
 * моя библиотека и id принятых друзей. Не зависит от профиля, поэтому страница
 * грузит это параллельно с getUserProfile.
 */
export async function getCompareContext(): Promise<{
  viewerId: string
  myItems: MediaItem[]
  friendIds: string[]
} | null> {
  const user = await getServerUser()
  if (!user) return null

  const supabase = await createServerClient()

  const [myItems, friendships] = await Promise.all([
    // Блок необязательный: ошибка здесь не должна ронять страницу профиля
    getMediaItems(supabase, user.id).catch(() => null),
    supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted'),
  ])

  if (!myItems || friendships.error) return null

  const friendIds = ((friendships.data ?? []) as FriendshipIds[]).map((row) =>
    row.user_id === user.id ? row.friend_id : row.user_id
  )

  return { viewerId: user.id, myItems, friendIds }
}
