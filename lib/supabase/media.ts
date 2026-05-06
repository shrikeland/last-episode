import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateMediaItemOptions,
  Database,
  MediaItem,
  MediaFilters,
  SortOptions,
  TmdbDetails,
} from '@/types'

type Client = SupabaseClient<Database>

export async function getMediaItems(
  client: Client,
  userId: string,
  filters?: MediaFilters,
  sort?: SortOptions
): Promise<MediaItem[]> {
  let query = client
    .from('media_items')
    .select('*')
    .eq('user_id', userId)

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }
  if (filters?.genre) {
    query = query.contains('genres', JSON.stringify([filters.genre]))
  }
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`title.ilike.${s},original_title.ilike.${s}`)
  }
  if (filters?.minRating != null) {
    query = query.gte('rating', filters.minRating)
  }
  if (filters?.maxRating != null) {
    query = query.lte('rating', filters.maxRating)
  }

  const field = sort?.field ?? 'release_year'
  const ascending = sort?.direction === 'asc'
  query = query.order(field, { ascending })

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as MediaItem[]
}

export async function getMediaItemById(
  client: Client,
  id: string,
  userId: string
): Promise<MediaItem | null> {
  const { data, error } = await client
    .from('media_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as MediaItem
}

export async function createMediaItem(
  client: Client,
  userId: string,
  details: TmdbDetails,
  options?: CreateMediaItemOptions
): Promise<{ item?: MediaItem; error?: 'already_exists' | 'db_error' }> {
  const { data, error } = await client
    .from('media_items')
    .insert({
      user_id: userId,
      tmdb_id: details.tmdb_id,
      type: details.type,
      title: details.title,
      original_title: details.original_title,
      overview: details.overview,
      poster_url: details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : null,
      release_year: details.release_year,
      genres: details.genres,
      status: options?.status ?? 'planned',
      rating: options?.rating ?? null,
      runtime_minutes: details.runtime_minutes,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'already_exists' }
    return { error: 'db_error' }
  }

  return { item: data as MediaItem }
}

export async function updateMediaItem(
  client: Client,
  id: string,
  userId: string,
  patch: Partial<Pick<MediaItem, 'status' | 'rating' | 'notes'>>
): Promise<MediaItem | null> {
  const { data, error } = await client
    .from('media_items')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as MediaItem
}

export async function deleteMediaItem(
  client: Client,
  id: string,
  userId: string
): Promise<void> {
  const { error } = await client
    .from('media_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw error
}
