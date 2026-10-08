import { test as setup } from '@/fixtures'
import { SEED_TITLES } from '@/support/test-data'

/**
 * Makes sure the user's library holds SEED_TITLES. Idempotent: titles already in the library
 * show «Добавлено» in search and are left alone. Runs as user (project `seed` loads
 * .auth/user.json written by auth.setup.ts).
 */
setup('seed user library', async ({ searchPage }) => {
  setup.setTimeout(120_000)
  for (const { query, kind, tmdbId } of SEED_TITLES) {
    await searchPage.ensureAdded(query, kind, tmdbId)
  }
})
