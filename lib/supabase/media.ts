import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateMediaItemOptions,
  Database,
  EpisodeProgress,
  LibraryCardItem,
  MediaItem,
  MediaFilters,
  SortOptions,
  TmdbDetails,
  TmdbKind,
} from '@/types'
import { collectCanonicalGenres, genreVariants } from '@/lib/genres'

type Client = SupabaseClient<Database>

function filteredMediaQuery(
  client: Client,
  columns: string,
  userId: string,
  filters?: MediaFilters,
  sort?: SortOptions
) {
  let query = client
    .from('media_items')
    .select(columns)
    .eq('user_id', userId)

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }
  if (filters?.genre) {
    // Жанр канонический: ищем все формы, в которых он лежит у фильмов и сериалов
    const variants = genreVariants(filters.genre)
    query = query.or(variants.map((v) => `genres.cs.${JSON.stringify([v])}`).join(','))
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
  if (filters?.unrated) {
    query = query.is('rating', null)
  }

  const field = sort?.field ?? 'release_year'
  const ascending = sort?.direction === 'asc'
  return query.order(field, { ascending })
}

export async function getMediaItems(
  client: Client,
  userId: string,
  filters?: MediaFilters,
  sort?: SortOptions
): Promise<MediaItem[]> {
  const { data, error } = await filteredMediaQuery(client, '*', userId, filters, sort)
  if (error) throw error
  return (data ?? []) as unknown as MediaItem[]
}

// Только то, что рисует карточка (+ genres для фильтра жанров): вся строка с overview и notes
// уходила в HTML и RSC-payload на каждую карточку
const LIBRARY_CARD_COLUMNS = 'id, title, poster_url, type, status, rating, release_year, genres'

export async function getLibraryCards(
  client: Client,
  userId: string,
  filters?: MediaFilters,
  sort?: SortOptions
): Promise<LibraryCardItem[]> {
  const { data, error } = await filteredMediaQuery(client, LIBRARY_CARD_COLUMNS, userId, filters, sort)
  if (error) throw error
  return (data ?? []) as unknown as LibraryCardItem[]
}

/** Канонические жанры всей библиотеки (без учёта фильтров) и общее число тайтлов — для FilterBar и шапки. */
export async function getLibraryGenres(
  client: Client,
  userId: string
): Promise<{ genres: string[]; total: number }> {
  const { data, error } = await client
    .from('media_items')
    .select('genres')
    .eq('user_id', userId)

  if (error) throw error
  return summarizeLibrary((data ?? []) as Pick<MediaItem, 'genres'>[])
}

/** То же, что getLibraryGenres, по уже загруженным строкам — когда выборка и так вся библиотека. */
export function summarizeLibrary(
  rows: Pick<MediaItem, 'genres'>[]
): { genres: string[]; total: number } {
  const genres = collectCanonicalGenres(rows.flatMap((r) => r.genres ?? []))
  return { genres, total: rows.length }
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

/**
 * id своей записи по (kind, tmdb_id) — для ссылки «Моя карточка» с чужой карточки тайтла.
 * Одного tmdb_id мало: фильм и сериал с одинаковым id — разные тайтлы.
 */
export async function getMediaItemIdByTmdbId(
  client: Client,
  userId: string,
  tmdbKind: TmdbKind,
  tmdbId: number
): Promise<string | null> {
  const { data, error } = await client
    .from('media_items')
    .select('id')
    .eq('user_id', userId)
    .eq('tmdb_kind', tmdbKind)
    .eq('tmdb_id', tmdbId)
    .maybeSingle()

  if (error || !data) return null
  return (data as Pick<MediaItem, 'id'>).id
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

export async function getEpisodeProgressMap(
  client: Client,
  itemIds: string[]
): Promise<Record<string, EpisodeProgress>> {
  if (itemIds.length === 0) return {}

  // Считаем в БД одной функцией: раньше тянули по строке на каждую просмотренную серию,
  // и ответ молча обрезался на max_rows (1000) у больших библиотек
  const { data, error } = await client.rpc('get_episode_progress', { item_ids: itemIds })
  if (error || !data) return {}

  const result: Record<string, EpisodeProgress> = {}
  for (const row of data as { media_item_id: string; watched: number; total: number }[]) {
    if (row.total > 0) {
      result[row.media_item_id] = { watched: row.watched, total: row.total }
    }
  }
  return result
}
