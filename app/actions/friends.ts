'use server'

import { createServerClient, getServerUser } from '@/lib/supabase/server'
import type { Profile } from '@/types'

type FriendshipRow = { id: string; user_id: string; friend_id: string; status: string }

export async function getMyFriends(): Promise<Profile[]> {
  const user = await getServerUser()
  if (!user) return []

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })

  if (error || !data || data.length === 0) return []

  const friendIds = (data as Pick<FriendshipRow, 'user_id' | 'friend_id'>[]).map((row) =>
    row.user_id === user.id ? row.friend_id : row.user_id
  )

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', friendIds)

  if (profilesError) return []

  const profileMap = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]))
  return friendIds.map((id) => profileMap.get(id)).filter(Boolean) as Profile[]
}

/** Incoming pending requests (other user sent to me) */
export async function getPendingRequests(): Promise<{ requestId: string; profile: Profile }[]> {
  const user = await getServerUser()
  if (!user) return []

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_id')
    .eq('friend_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error || !data || data.length === 0) return []

  const rows = data as Pick<FriendshipRow, 'id' | 'user_id'>[]
  const requesterIds = rows.map((r) => r.user_id)

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', requesterIds)

  if (profilesError) return []

  const profileMap = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]))
  return rows
    .map((row) => ({ requestId: row.id, profile: profileMap.get(row.user_id)! }))
    .filter((r) => r.profile != null)
}

/** IDs of users I've sent a pending request to */
export async function getPendingOutgoingIds(): Promise<string[]> {
  const user = await getServerUser()
  if (!user) return []

  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error || !data) return []
  return (data as Pick<FriendshipRow, 'friend_id'>[]).map((r) => r.friend_id)
}

/** Count of incoming pending requests (for navbar badge) */
export async function getPendingCount(): Promise<number> {
  const user = await getServerUser()
  if (!user) return 0

  const supabase = await createServerClient()

  const { count, error } = await supabase
    .from('friendships')
    .select('id', { count: 'exact', head: true })
    .eq('friend_id', user.id)
    .eq('status', 'pending')

  if (error) return 0
  return count ?? 0
}

export async function sendFriendRequest(friendId: string): Promise<{ error?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Unauthorized' }

  const supabase = await createServerClient()

  const { error } = await supabase
    .from('friendships')
    .insert({ user_id: user.id, friend_id: friendId, status: 'pending' })

  if (error) return { error: error.message }
  return {}
}

export async function acceptFriendRequest(requestId: string): Promise<{ error?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Unauthorized' }

  const supabase = await createServerClient()

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('friend_id', user.id)

  if (error) return { error: error.message }
  return {}
}

/** Decline incoming request or cancel outgoing request */
export async function declineFriendRequest(requestId: string): Promise<{ error?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Unauthorized' }

  const supabase = await createServerClient()

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', requestId)

  if (error) return { error: error.message }
  return {}
}

/** Cancel outgoing pending request by target user ID */
export async function cancelFriendRequest(friendId: string): Promise<{ error?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Unauthorized' }

  const supabase = await createServerClient()

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', user.id)
    .eq('friend_id', friendId)
    .eq('status', 'pending')

  if (error) return { error: error.message }
  return {}
}

/** Remove an accepted friend (either direction) */
export async function removeFriend(friendId: string): Promise<{ error?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Unauthorized' }

  const supabase = await createServerClient()

  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
    .eq('status', 'accepted')

  if (error) return { error: error.message }
  return {}
}
