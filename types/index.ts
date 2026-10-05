export type MediaType = 'movie' | 'animation' | 'tv' | 'anime'

/** TMDB-пространство id: фильмы и сериалы нумеруются независимо (см. lib/tmdb/kind.ts). */
export type TmdbKind = 'movie' | 'tv'

export type MediaStatus =
  | 'watching'
  | 'completed'
  | 'planned'
  | 'dropped'
  | 'on_hold'

export type MediaRating = number | null

export interface CreateMediaItemOptions {
  status?: MediaStatus
  rating?: MediaRating
}

export const MEDIA_STATUS_LABELS: Record<MediaStatus, string> = {
  watching: 'Смотрю',
  completed: 'Просмотрено',
  planned: 'Хочу посмотреть',
  dropped: 'Брошено',
  on_hold: 'Отложено',
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Фильм',
  animation: 'Мультфильм',
  tv: 'Сериал',
  anime: 'Аниме',
}

export interface MediaItem {
  id: string
  user_id: string
  tmdb_id: number
  /** Генерируется БД из type — не записывается приложением. */
  tmdb_kind: TmdbKind
  type: MediaType
  title: string
  original_title: string
  overview: string
  poster_url: string | null
  release_year: number | null
  genres: string[]
  status: MediaStatus
  rating: number | null
  notes: string | null
  runtime_minutes: number | null
  created_at: string
  updated_at: string
}

/** Поля MediaItem, которые нужны карточке библиотеки (см. getLibraryCards). */
export type LibraryCardItem = Pick<
  MediaItem,
  'id' | 'title' | 'poster_url' | 'type' | 'status' | 'rating' | 'release_year' | 'genres'
>

export interface EpisodeProgress {
  watched: number
  total: number
}

export interface Season {
  id: string
  media_item_id: string
  tmdb_season_id: number
  season_number: number
  name: string
  episode_count: number
}

export interface Episode {
  id: string
  season_id: string
  tmdb_episode_id: number
  episode_number: number
  name: string
  runtime_minutes: number | null
  is_watched: boolean
  watched_at: string | null
  is_filler: boolean
}

export interface SeasonWithEpisodes extends Season {
  episodes: Episode[]
}

/** Первая непросмотренная серия тайтла — для блока «Продолжить». */
export interface NextEpisode {
  id: string
  episode_number: number
  name: string
  is_filler: boolean
  season_number: number
}

export interface ContinueItem {
  item: Pick<MediaItem, 'id' | 'title' | 'poster_url' | 'type'>
  next: NextEpisode
  lastWatchedAt: string
}

// TMDB API shapes
export interface TmdbSearchResult {
  tmdb_id: number
  type: MediaType
  title: string
  original_title: string
  poster_path: string | null
  release_year: number | null
  overview: string
  vote_average?: number | null
  vote_count?: number | null
  genre_ids?: number[]
}

export interface TmdbDetails extends TmdbSearchResult {
  genres: string[]
  runtime_minutes: number | null
  seasons?: TmdbSeason[]
}

export interface TmdbSeason {
  tmdb_season_id: number
  season_number: number
  name: string
  episode_count: number
  episodes: TmdbEpisode[]
}

export interface TmdbEpisode {
  tmdb_episode_id: number
  episode_number: number
  name: string
  runtime_minutes: number | null
}

// Filters
export interface MediaFilters {
  search?: string
  status?: MediaStatus | 'all'
  type?: MediaType | 'all'
  genre?: string
  minRating?: number
  maxRating?: number
  unrated?: boolean
}

export const SORT_FIELDS = ['created_at', 'updated_at', 'release_year', 'title', 'rating'] as const
export type SortField = (typeof SORT_FIELDS)[number]
export type SortDirection = 'asc' | 'desc'

export interface SortOptions {
  field: SortField
  direction: SortDirection
}

// Stats
export interface WatchStats {
  totalMinutes: number
  formattedTime: string
  byType: Record<MediaType, { count: number; minutes: number }>
  byStatus: Record<MediaStatus, number>
  topGenres: { genre: string; count: number }[]
}

// Watch timeline
export interface WatchHistoryRow {
  episode_id: string
  episode_number: number
  runtime_minutes: number | null
  watched_at: string
  season_number: number
  media_item_id: string
  title: string
  poster_url: string | null
}

export interface WatchTimelineEntry {
  key: string
  media_item_id: string
  title: string
  poster_url: string | null
  // Single episode: seasons has one element and episodeNumber is set.
  // Batch (mark season / mark whole title): episodeNumber is null.
  seasons: number[]
  episodeNumber: number | null
  episodeCount: number
}

export interface WatchTimelineDay {
  dateKey: string
  label: string
  entries: WatchTimelineEntry[]
}

export interface WatchTimeline {
  days: WatchTimelineDay[]
  totalEpisodes: number
  totalMinutes: number
}

// Profile
export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  is_library_public: boolean
  created_at: string
}

// Схема БД для типизации Supabase-клиентов — сгенерирована, см. types/database.ts
export type { Database, Json } from './database'
