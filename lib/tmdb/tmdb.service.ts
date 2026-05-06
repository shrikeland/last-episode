import type { MediaType, TmdbSearchResult, TmdbDetails, TmdbSeason, TmdbEpisode } from '@/types'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const TMDB_PROFILE_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185'
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

export function buildProfileUrl(profilePath: string | null): string | null {
  if (!profilePath) return null
  return `${TMDB_PROFILE_IMAGE_BASE}${profilePath}`
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

   
  const data: any = await res.json()

   
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
      vote_average: r.vote_average ?? null,
      vote_count: r.vote_count ?? null,
      genre_ids: r.genre_ids ?? [],
    }))
}

export async function getMovieDetails(tmdbId: number, type: 'movie' | 'animation' = 'movie'): Promise<TmdbDetails> {
  const url = buildUrl(`/movie/${tmdbId}`)
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`TMDB movie details failed: ${res.status}`)

   
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

export interface TmdbCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  profile_url: string | null
}

type RawCastMember = {
  id: number
  name?: string | null
  character?: string | null
  profile_path?: string | null
  order?: number | null
}

type RawCrewMember = {
  job?: string | null
  name?: string | null
}

type RawCredits = {
  cast?: RawCastMember[]
  crew?: RawCrewMember[]
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
   
  const data = (await res.json()) as RawCredits
  const director =
    mediaType === 'movie'
       
      ? (data.crew ?? []).find((c) => c.job === 'Director')?.name ?? null
      : null
   
  const cast = (data.cast ?? [])
    .slice(0, 6)
    .map((c) => c.name ?? '')
    .filter(Boolean)
  return { director, cast }
}

export async function getTopCast(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  limit = 12
): Promise<TmdbCastMember[]> {
  try {
    const url = buildUrl(`/${mediaType}/${tmdbId}/credits`)
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return []

    const data = (await res.json()) as RawCredits
    return (data.cast ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
      .slice(0, limit)
      .map((member) => ({
        id: member.id,
        name: member.name ?? '',
        character: member.character ?? '',
        profile_path: member.profile_path ?? null,
        profile_url: buildProfileUrl(member.profile_path ?? null),
      }))
      .filter((member) => member.name.length > 0)
  } catch {
    return []
  }
}

export async function getBasicInfo(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TmdbBasicInfo> {
  const url = buildUrl(`/${mediaType}/${tmdbId}`)
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`TMDB ${mediaType} basic info failed: ${res.status}`)
   
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

type RawSeason = { season_number: number; id: number; name: string; episode_count: number }

export async function getTVDetails(tmdbId: number, type: MediaType): Promise<TmdbDetails> {
  const url = buildUrl(`/tv/${tmdbId}`)
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`TMDB tv details failed: ${res.status}`)

   
  const r: any = await res.json()

  const regularSeasons = ((r.seasons ?? []) as RawSeason[]).filter(s => s.season_number !== 0)

  const responses = await Promise.all(
    regularSeasons.map(s =>
      fetch(buildUrl(`/tv/${tmdbId}/season/${s.season_number}`), { next: { revalidate: 0 } })
    )
  )

  const seasons: TmdbSeason[] = []
  for (let i = 0; i < regularSeasons.length; i++) {
    const s = regularSeasons[i]
    const epRes = responses[i]
    if (!epRes.ok) continue

     
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
      episode_count: s.episode_count,
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
