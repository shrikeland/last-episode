export type MediaType = 'movie' | 'animation' | 'tv' | 'anime'

export type MediaStatus =
  | 'watching'
  | 'completed'
  | 'planned'
  | 'dropped'
  | 'on_hold'

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
}

export type SortField = 'created_at' | 'title' | 'rating'
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

// Profile
export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  is_library_public: boolean
  created_at: string
}

// Database types for Supabase typed client
export type Database = {
  public: {
    Tables: {
      media_items: {
        Row: MediaItem
        Insert: Omit<MediaItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MediaItem, 'id' | 'user_id' | 'created_at'>>
      }
      seasons: {
        Row: Season
        Insert: Omit<Season, 'id'>
        Update: Partial<Omit<Season, 'id' | 'media_item_id'>>
      }
      episodes: {
        Row: Episode
        Insert: Omit<Episode, 'id'>
        Update: Partial<Omit<Episode, 'id' | 'season_id'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      taste_profiles: {
        Row: { id: string; user_id: string; summary: string; updated_at: string }
        Insert: { user_id: string; summary: string; updated_at?: string }
        Update: { summary?: string; updated_at?: string }
      }
      recommendation_history: {
        Row: { id: string; user_id: string; tmdb_id: number; title: string; created_at: string }
        Insert: { user_id: string; tmdb_id: number; title: string; created_at?: string }
        Update: never
      }
    }
  }
}