import type { TmdbKind } from '@/types'

// TMDB нумерует фильмы и сериалы в разных пространствах: movie 1399 и tv 1399 —
// разные тайтлы. Тайтл однозначно определяет только пара (kind, tmdb_id).

/**
 * TMDB-пространство тайтла по нашему type: movie|animation живут в /movie,
 * tv|anime — в /tv (см. normalizeType в tmdb.service). Принимает string,
 * потому что карточки рекомендаций приходят с сервера с type: string;
 * неизвестный тип считается фильмом — так же его добавляет RecommendationCard.
 * Зеркало генерируемой колонки media_items.tmdb_kind.
 */
export function tmdbKindOf(type: string): TmdbKind {
  return type === 'tv' || type === 'anime' ? 'tv' : 'movie'
}

/** Ключ тайтла для Set/Map и React key: 'movie:1399'. */
export function tmdbTitleKey(kind: TmdbKind, tmdbId: number): string {
  return `${kind}:${tmdbId}`
}

export function mediaTitleKey(type: string, tmdbId: number): string {
  return tmdbTitleKey(tmdbKindOf(type), tmdbId)
}
