const ANILIST_URL = 'https://graphql.anilist.co'

const QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME, isAdult: false) {
    idMal
    title {
      romaji
      english
    }
  }
}
`

export interface AniListMatch {
  malId: number
  titleRomaji: string
  titleEnglish: string | null
}

/**
 * Search AniList by anime title → returns MAL ID for use with Jikan API.
 * Returns null if not found or request fails.
 */
export async function searchAniList(title: string): Promise<AniListMatch | null> {
  try {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { search: title } }),
    })

    if (!res.ok) return null

    const json = await res.json()
    const media = json?.data?.Media

    if (!media || !media.idMal) return null

    return {
      malId: media.idMal,
      titleRomaji: media.title?.romaji ?? title,
      titleEnglish: media.title?.english ?? null,
    }
  } catch {
    return null
  }
}