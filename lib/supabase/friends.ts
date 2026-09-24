import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import type { Database, MediaStatus, MediaType, TmdbKind } from '@/types'

type Client = SupabaseClient<Database>

/** Что друг сделал с тайтлом. Только то, что показываем: без user_id, заметок и дат. */
export interface FriendTitleEntry {
  username: string
  /** id записи media_items друга — для ссылки /profile/<username>/media/<id> */
  mediaItemId: string
  status: MediaStatus
  rating: number | null
  /** Последняя отмеченная серия — только для сериалов в статусе «Смотрю» / «Брошено» */
  lastEpisode: { season: number; episode: number } | null
}

// «Хочу посмотреть» — слабый сигнал, поэтому последним
const STATUS_ORDER: Record<MediaStatus, number> = {
  completed: 0,
  watching: 1,
  on_hold: 2,
  dropped: 3,
  planned: 4,
}

const STATUSES_WITH_EPISODE: ReadonlySet<MediaStatus> = new Set(['watching', 'dropped'])

/**
 * Друзья текущего пользователя, у которых этот тайтл есть в библиотеке.
 *
 * Безопасность: чужие media_items закрыты RLS, поэтому читаются service client,
 * который RLS обходит. Доступ ограничивается здесь, в коде, и порядок шагов важен:
 * 1. friendships — RLS-клиентом пользователя: только принятые дружбы, где он одна из сторон;
 * 2. profiles — только эти друзья и только с открытой библиотекой;
 * 3. service client читает media_items строго по user_id из шага 2 и по одному тайтлу (kind, tmdb_id),
 *    а episodes — строго по id записей из шага 3.
 *
 * `userId` должен приходить из getServerUser(). Ошибки глотаются: блок необязательный,
 * страница без него должна открываться.
 */
export async function getFriendsWithTitle(
  client: Client,
  userId: string,
  tmdbKind: TmdbKind,
  tmdbId: number
): Promise<FriendTitleEntry[]> {
  if (!userId || !Number.isInteger(tmdbId)) return []

  try {
    // 1. Принятые дружбы — обе стороны связи. RLS и так пускает только свои строки,
    //    явный фильтр дублирует её, чтобы не зависеть от политики.
    const { data: friendships, error: friendshipsError } = await client
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')

    if (friendshipsError || !friendships || friendships.length === 0) return []

    const friendIds = new Set<string>()
    for (const row of friendships as { user_id: string; friend_id: string }[]) {
      if (row.user_id === userId && row.friend_id !== userId) friendIds.add(row.friend_id)
      else if (row.friend_id === userId && row.user_id !== userId) friendIds.add(row.user_id)
    }
    if (friendIds.size === 0) return []

    // 2. Только друзья с открытой библиотекой
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id, username')
      .in('id', [...friendIds])
      .eq('is_library_public', true)

    if (profilesError || !profiles || profiles.length === 0) return []

    const usernameById = new Map(
      (profiles as { id: string; username: string }[])
        .filter((p) => friendIds.has(p.id))
        .map((p) => [p.id, p.username])
    )
    if (usernameById.size === 0) return []

    // 3. Service client — только по отфильтрованным user_id и одному тайтлу.
    //    Фильм и сериал с одним tmdb_id — разные тайтлы, поэтому фильтр и по kind
    const service = createServiceClient()
    const { data: items, error: itemsError } = await service
      .from('media_items')
      .select('id, user_id, type, status, rating')
      .eq('tmdb_kind', tmdbKind)
      .eq('tmdb_id', tmdbId)
      .in('user_id', [...usernameById.keys()])

    if (itemsError || !items || items.length === 0) return []

    const rows = (items as {
      id: string
      user_id: string
      type: MediaType
      status: MediaStatus
      rating: number | null
    }[]).filter((item) => usernameById.has(item.user_id))

    // 4. «Где остановился» — по запросу на тайтл друга, параллельно
    const lastEpisodes = await Promise.all(
      rows.map((item) =>
        item.type !== 'movie' && item.type !== 'animation' && STATUSES_WITH_EPISODE.has(item.status)
          ? getLastWatchedEpisode(service, item.id)
          : Promise.resolve(null)
      )
    )

    const entries: FriendTitleEntry[] = rows.map((item, index) => ({
      username: usernameById.get(item.user_id)!,
      mediaItemId: item.id,
      status: item.status,
      rating: item.rating == null ? null : Number(item.rating),
      lastEpisode: lastEpisodes[index],
    }))

    return entries.sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (b.rating ?? -1) - (a.rating ?? -1) ||
        a.username.localeCompare(b.username)
    )
  } catch (error) {
    console.error('[friends/getFriendsWithTitle]', error)
    return []
  }
}

/** Последняя отмеченная серия тайтла по watched_at — как getLastWatchedAt в progress.ts. */
async function getLastWatchedEpisode(
  service: Client,
  mediaItemId: string
): Promise<{ season: number; episode: number } | null> {
  const { data, error } = await service
    .from('episodes')
    .select('episode_number, seasons!inner(season_number, media_item_id)')
    .eq('seasons.media_item_id', mediaItemId)
    .eq('is_watched', true)
    .not('watched_at', 'is', null)
    .order('watched_at', { ascending: false })
    .order('episode_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const row = data as unknown as {
    episode_number: number
    seasons: { season_number: number } | { season_number: number }[]
  }
  const season = Array.isArray(row.seasons) ? row.seasons[0] : row.seasons
  if (!season) return null
  return { season: season.season_number, episode: row.episode_number }
}
