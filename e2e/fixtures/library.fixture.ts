import { test as authTest } from '@/fixtures/auth.fixture'
import { isBaseUrlReachable } from '@/support/network'
import { ensureLibrarySeeded } from '@/support/seed'

/**
 * authTest + a library that is guaranteed to hold the SEED_TITLES.
 * The CI test account starts empty («Коллекция пуста»), so every spec that needs cards
 * imports `test` from here instead of auth.fixture. Worker-scoped and auto: seeding runs
 * once per worker, and only for tests of this `test` — unauthenticated tests in the same
 * file (plain @playwright/test) don't wait for it and don't fail with it.
 */
export const test = authTest.extend<object, { seededLibrary: void }>({
  seededLibrary: [
    async ({ browser }, use, workerInfo) => {
      if (await isBaseUrlReachable()) {
        const { baseURL, extraHTTPHeaders, ignoreHTTPSErrors } = workerInfo.project.use
        await ensureLibrarySeeded(browser, { baseURL, extraHTTPHeaders, ignoreHTTPSErrors })
      }
      await use()
    },
    { scope: 'worker', auto: true, timeout: 120_000 },
  ],
})

export { expect } from '@playwright/test'
