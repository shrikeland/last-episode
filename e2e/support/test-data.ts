/**
 * Test data shared by the setup projects, fixtures and specs.
 * kind + tmdbId pin the exact TMDB search result (`tmdb-result-card-<kind>-<id>`) — /search/multi
 * ranking drifts, and movie and tv ids are separate sequences in TMDB (see lib/tmdb/kind.ts).
 */

export type TmdbKind = 'movie' | 'tv'

export interface CatalogTitle {
  /** What to type into /search */
  query: string
  kind: TmdbKind
  tmdbId: number
}

/**
 * Titles that must always be in the user's library — added by tests/setup/seed.setup.ts.
 * The CI test account starts empty («Коллекция пуста»), so they are added through the UI.
 * - two movies: TC-LIB-SORT-003 needs ≥2 cards in the flat `type=movie` list
 * - a TV show with one season of 5 episodes: TC-MEDIA-003/004 and auto-complete-status.spec
 *   (it looks the show up by its Russian title «Чернобыль»)
 * - two more movies: /recommendations locks the questionnaire below 5 library titles (server-side
 *   count, no mock lifts it) — the seed alone keeps the account at ≥5
 * Specs never delete them.
 */
export const SEED_TITLES: readonly CatalogTitle[] = [
  { query: 'Inception', kind: 'movie', tmdbId: 27205 },
  { query: 'Interstellar', kind: 'movie', tmdbId: 157336 },
  { query: 'Chernobyl', kind: 'tv', tmdbId: 87108 },
  { query: 'The Matrix', kind: 'movie', tmdbId: 603 },
  { query: 'Parasite 2019', kind: 'movie', tmdbId: 496243 },
]

export interface ThrowawayTitle extends CatalogTitle {
  /**
   * The title as the library card shows it (TMDB ru-RU title). The `throwawayTitle` fixture
   * finds the card by this exact text, so it must not match any other title in the library.
   */
  title: string
}

/**
 * One throwaway title per area (part of plans/e2e-refactor-and-coverage.md). A test gets it
 * through the `throwawayTitle(key)` fixture: added fresh before the test, deleted in teardown.
 * Each area uses only its own key — tests of different areas never share a throwaway row.
 * All differ from SEED_TITLES and from each other; every entry was checked with a real search
 * on prod. Shows are short on purpose: episode toggles click through whole seasons.
 */
export const THROWAWAY_TITLES = {
  /** Library and search (part B). A show: «Продолжить просмотр» needs episodes */
  library: { query: 'The Queen\'s Gambit', kind: 'tv', tmdbId: 87739, title: 'Ход королевы' },
  /** Media page and episode tracking (part C). Two seasons of 6: «mark up to» across seasons */
  media: { query: 'Fleabag', kind: 'tv', tmdbId: 67070, title: 'Дрянь' },
  /**
   * AI recommendations (part E): the real TMDB title inside the mocked stream.
   * Not Koyaanisqatsi: TC-LIB-004 still adds and deletes that one until part B rewrites it
   */
  recs: { query: 'Powaqqatsi', kind: 'movie', tmdbId: 24348, title: 'Поваккатси' },
  /** Social scenarios (part F) */
  social: { query: 'Samsara', kind: 'movie', tmdbId: 89708, title: 'Самсара' },
  /** Stats (part D) */
  stats: { query: 'Baraka', kind: 'movie', tmdbId: 14002, title: 'Барака' },
} as const satisfies Record<string, ThrowawayTitle>

export type ThrowawayKey = keyof typeof THROWAWAY_TITLES
