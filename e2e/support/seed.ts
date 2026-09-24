import type { Browser, BrowserContextOptions } from '@playwright/test'
import { newAuthenticatedContext } from '@/fixtures/auth.fixture'
import { SearchPage } from '@/pages/SearchPage'

/**
 * Titles the library-dependent specs rely on. The CI test account starts empty
 * («Коллекция пуста»), so they are added through the UI, exactly like a user would.
 * - two movies: TC-LIB-SORT-003 needs ≥2 cards in the flat `type=movie` list
 * - a TV show with one season of 5 episodes: TC-MEDIA-003/004 and auto-complete-status.spec
 *   (it looks the show up by its Russian title «Чернобыль»)
 * kind + tmdb_id pin the exact result — /search/multi ranking drifts.
 */
export const SEED_TITLES = [
  { query: 'Inception', kind: 'movie', tmdbId: 27205 },
  { query: 'Interstellar', kind: 'movie', tmdbId: 157336 },
  { query: 'Chernobyl', kind: 'tv', tmdbId: 87108 },
] as const

// Once per worker process; a worker restarted after a failure re-checks (cheap when already added)
let seeded = false

/** Idempotent: titles already in the library show «Добавлено» in search and are left alone. */
export async function ensureLibrarySeeded(browser: Browser, options: BrowserContextOptions) {
  if (seeded) return
  const context = await newAuthenticatedContext(browser, options)
  try {
    const search = new SearchPage(await context.newPage())
    for (const { query, kind, tmdbId } of SEED_TITLES) {
      await search.ensureAdded(query, kind, tmdbId)
    }
    seeded = true
  } finally {
    await context.close()
  }
}
