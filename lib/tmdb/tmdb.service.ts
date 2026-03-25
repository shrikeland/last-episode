import type { MediaType, TmdbSearchResult, TmdbDetails, TmdbSeason, TmdbEpisode } from '@/types'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const LANG = 'ru-RU'

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error('TMDB_API_KEY is not set')
  return key
}

function buildUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${TMDB_BASE_URL}${path}`)
  url.searchParams.set('api_key', getApiKey())
  url.searchParams.set('language', LANG)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

export function buildPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null
  return `${TMDB_IMAGE_BASE}${posterPath}`
}

export function normalizeType(
  mediaType: 'movie' | 'tv',
  genreIds: number[],
  originCountries: string[]
): MediaType {
  if (mediaType === 'movie') {
    if (genreIds.includes(16)) return 'animation'
    return 'movie'
  }
  if (genreIds.includes(16) && originCountries.includes('JP')) return 'anime'
  return 'tv'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const year = parseInt(dateStr.slice(0, 4), 10)
  return isNaN(year) ? null : year
}

export async function search(query: string): Promise<TmdbSearchResult[]> {
  if (!query.trim()) return []

  const url = buildUrl('/search/multi', { query, include_adult: 'false' })
  const res = await fetch(url, { next: { revalidate: 0 } })

  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.results as any[])
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 20)
    .map((r) => ({
      tmdb_id: r.id,
      type: normalizeType(r.media_type, r.genre_ids ?? [], r.origin_country ?? []),
      title: r.title ?? r.name ?? '',
      original_title: r.original_title ?? r.original_name ?? '',
      poster_path: r.poster_path ?? null,
      release_year: extractYear(r.release_date ?? r.first_air_date),
      overview: r.overview ?? '',
    }))
}

export async function getMovieDetails(tmdbId: number, type: 'movie' | 'animation' = 'movie'): Promise<TmdbDetails> {
  const url = buildUrl(`/movie/${tmdbId}`)
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`TMDB movie details failed: ${res.status}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = await res.json()

  // Auto-detect animation type by genre 16 if not explicitly provided
  const resolvedType: MediaType =
    type === 'movie' && (r.genre_ids ?? r.genres?.map((g: { id: number }) => g.id) ?? []).includes(16)
      ? 'animation'
      : type

  return {
    tmdb_id: r.id,
    type: resolvedType,
    title: r.title ?? '',
    original_title: r.original_title ?? '',
    poster_path: r.poster_path ?? null,
    release_year: extractYear(r.release_date),
    overview: r.overview ?? '',
    genres: (r.genres ?? []).map((g: { name: string }) => g.name),
    runtime_minutes: r.runtime ?? null,
  }
}

export interface TmdbCredits {
  director: string | null
  cast: string[]
}

export interface TmdbBasicInfo {
  title: string
  overview: string
  genres: string[]
  posterPath: string | null
  releaseYear: number | null
  voteAverage: number | null
  voteCount: number | null
  runtimeMinutes: number | null
  seasonCount: number | null
}

export async function getCredits(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TmdbCredits> {
  const url = buildUrl(`/${mediaType}/${tmdbId}/credits`)
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return { director: null, cast: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json()
  const director =
    mediaType === 'movie'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? ((data.crew as any[]) ?? []).find((c) => c.job === 'Director')?.name ?? null
      : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cast = ((data.cast as any[]) ?? []).slice(0, 6).map((c) => c.name as string)
  return { director, cast }
}

export async function getBasicInfo(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TmdbBasicInfo> {
  const url = buildUrl(`/${mediaType}/${tmdbId}`)
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`TMDB ${mediaType} basic info failed: ${res.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = await res.json()
  if (mediaType === 'movie') {
    return {
      title: r.title ?? '',
      overview: r.overview ?? '',
      genres: (r.genres ?? []).map((g: { name: string }) => g.name),
      posterPath: r.poster_path ?? null,
      releaseYear: extractYear(r.release_date),
      voteAverage: r.vote_average ?? null,
      voteCount: r.vote_count ?? null,
      runtimeMinutes: r.runtime ?? null,
      seasonCount: null,
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seasonCount = ((r.seasons ?? []) as any[]).filter((s) => s.season_number > 0).length
    return {
      title: r.name ?? '',
      overview: r.overview ?? '',
      genres: (r.genres ?? []).map((g: { name: string }) => g.name),
      posterPath: r.poster_path ?? null,
      releaseYear: extractYear(r.first_air_date),
      voteAverage: r.vote_average ?? null,
      voteCount: r.vote_count ?? null,
      runtimeMinutes: r.episode_run_time?.[0] ?? null,
      seasonCount: seasonCount || null,
    }
  }
}

export async function getTVDetails(tmdbId: number, type: MediaType): Promise<TmdbDetails> {
  const url = buildUrl(`/tv/${tmdbId}`)
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`TMDB tv details failed: ${res.status}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = await res.json()

  const seasons: TmdbSeason[] = []
  for (const s of (r.seasons ?? []) as { season_number: number; id: number; name: string; episode_count: number }[]) {
    if (s.season_number === 0) continue // пропускаем "Specials"

    const episodesUrl = buildUrl(`/tv/${tmdbId}/season/${s.season_number}`)
    const epRes = await fetch(episodesUrl, { next: { revalidate: 0 } })
    if (!epRes.ok) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const epData: any = await epRes.json()
    const episodes: TmdbEpisode[] = (epData.episodes ?? []).map(
      (e: { id: number; episode_number: number; name: string; runtime: number | null }) => ({
        tmdb_episode_id: e.id,
        episode_number: e.episode_number,
        name: e.name ?? '',
        runtime_minutes: e.runtime ?? null,
      })
    )

    seasons.push({
      tmdb_season_id: s.id,
      season_number: s.season_number,
      name: s.name ?? `Сезон ${s.season_number}`,
      episodes,
    })
  }

  return {
    tmdb_id: r.id,
    type,
    title: r.name ?? '',
    original_title: r.original_name ?? '',
    poster_path: r.poster_path ?? null,
    release_year: extractYear(r.first_air_date),
    overview: r.overview ?? '',
    genres: (r.genres ?? []).map((g: { name: string }) => g.name),
    runtime_minutes: r.episode_run_time?.[0] ?? null,
    seasons,
  }
}
