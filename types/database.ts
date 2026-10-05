// Сгенерировано из схемы Supabase (MCP generate_typescript_types / `supabase gen types typescript`).
// Не править руками: после миграции перегенерировать целиком. Доменные типы (MediaItem и т.д.) — в types/index.ts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anime_filler_cache: {
        Row: {
          fetched_at: string
          source_url: string | null
          status: string
          tmdb_id: number
        }
        Insert: {
          fetched_at?: string
          source_url?: string | null
          status: string
          tmdb_id: number
        }
        Update: {
          fetched_at?: string
          source_url?: string | null
          status?: string
          tmdb_id?: number
        }
        Relationships: []
      }
      episodes: {
        Row: {
          episode_number: number
          id: string
          is_filler: boolean
          is_watched: boolean
          name: string
          runtime_minutes: number | null
          season_id: string
          tmdb_episode_id: number
          watched_at: string | null
        }
        Insert: {
          episode_number: number
          id?: string
          is_filler?: boolean
          is_watched?: boolean
          name?: string
          runtime_minutes?: number | null
          season_id: string
          tmdb_episode_id: number
          watched_at?: string | null
        }
        Update: {
          episode_number?: number
          id?: string
          is_filler?: boolean
          is_watched?: boolean
          name?: string
          runtime_minutes?: number | null
          season_id?: string
          tmdb_episode_id?: number
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      filler_episodes: {
        Row: {
          absolute_episode_number: number
          tmdb_id: number
        }
        Insert: {
          absolute_episode_number: number
          tmdb_id: number
        }
        Update: {
          absolute_episode_number?: number
          tmdb_id?: number
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          created_at: string
          genres: Json
          id: string
          notes: string | null
          original_title: string
          overview: string
          poster_url: string | null
          rating: number | null
          release_year: number | null
          runtime_minutes: number | null
          status: string
          title: string
          tmdb_id: number
          tmdb_kind: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          genres?: Json
          id?: string
          notes?: string | null
          original_title?: string
          overview?: string
          poster_url?: string | null
          rating?: number | null
          release_year?: number | null
          runtime_minutes?: number | null
          status?: string
          title: string
          tmdb_id: number
          tmdb_kind?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          genres?: Json
          id?: string
          notes?: string | null
          original_title?: string
          overview?: string
          poster_url?: string | null
          rating?: number | null
          release_year?: number | null
          runtime_minutes?: number | null
          status?: string
          title?: string
          tmdb_id?: number
          tmdb_kind?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_library_public: boolean
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          is_library_public?: boolean
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_library_public?: boolean
          username?: string
        }
        Relationships: []
      }
      recommendation_history: {
        Row: {
          created_at: string
          id: string
          title: string
          tmdb_id: number
          tmdb_kind: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          tmdb_id: number
          tmdb_kind?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          tmdb_id?: number
          tmdb_kind?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          episode_count: number
          id: string
          media_item_id: string
          name: string
          season_number: number
          tmdb_season_id: number
        }
        Insert: {
          episode_count?: number
          id?: string
          media_item_id: string
          name?: string
          season_number: number
          tmdb_season_id: number
        }
        Update: {
          episode_count?: number
          id?: string
          media_item_id?: string
          name?: string
          season_number?: number
          tmdb_season_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "seasons_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      taste_profiles: {
        Row: {
          id: string
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_continue_watching: {
        Args: { p_user_id: string }
        Returns: {
          episode_name: string
          episode_number: number
          is_filler: boolean
          last_watched_at: string
          media_item_id: string
          next_episode_id: string
          poster_url: string
          season_number: number
          title: string
          type: string
        }[]
      }
      get_episode_progress: {
        Args: { item_ids: string[] }
        Returns: {
          media_item_id: string
          total: number
          watched: number
        }[]
      }
      get_watched_minutes: {
        Args: { item_ids: string[] }
        Returns: {
          media_item_id: string
          minutes: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
