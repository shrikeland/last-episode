const JIKAN_BASE = 'https://api.jikan.moe/v4'

// Jikan rate limit: 3 req/sec — small delay between paginated requests
const DELAY_MS = 400

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch all filler episode numbers for an anime by MAL ID.
 * Uses Jikan API v4 — paginated, up to 100 episodes per page.
 * Returns absolute episode numbers (mal_id field = episode number).
 */
export async function getFillerEpisodeNumbers(malId: number): Promise<number[]> {
  const fillerNumbers: number[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    try {
      const url = `${JIKAN_BASE}/anime/${malId}/episodes?page=${page}`
      const res = await fetch(url, { next: { revalidate: 0 } })

      if (!res.ok) {
        // 404 means no episode data for this anime on MAL
        break
      }

      const json = await res.json()
      const episodes: { mal_id: number; filler: boolean }[] = json?.data ?? []

      for (const ep of episodes) {
        if (ep.filler === true) {
          fillerNumbers.push(ep.mal_id)
        }
      }

      hasNextPage = json?.pagination?.has_next_page === true
      page++

      if (hasNextPage) {
        await sleep(DELAY_MS)
      }
    } catch {
      break
    }
  }

  return fillerNumbers
}
