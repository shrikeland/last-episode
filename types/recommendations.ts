export type ContentType = 'movie' | 'animation' | 'tv' | 'anime' | 'any'
export type Familiarity = 'new_only' | 'include_planned' | 'include_rewatch'

export interface QuestionnaireAnswers {
  contentType: ContentType
  mood: string
  exclusions: string[]
  familiarity: Familiarity
}

export interface RecommendationCardData {
  title: string
  year: number | null
  type: string
  reason: string
  tmdbId: number | null
  posterUrl: string | null
  /** Тайтл уже в библиотеке пользователя — проставляет /api/recommendations/generate. */
  inLibrary?: boolean
}

export interface TasteProfile {
  summary: string
  updated_at: string
}

export interface RecommendationDetails {
  title: string
  year: number | null
  type: string
  posterUrl: string | null
  overview: string
  genres: string[]
  voteAverage: number | null
  voteCount: number | null
  runtime: string | null
  director: string | null
  cast: string[]
  reason: string
}
