import { test as base, type Page } from '@playwright/test'
import { CommunityPage } from '@/pages/CommunityPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { LoginPage } from '@/pages/LoginPage'
import { MediaPage } from '@/pages/MediaPage'
import { NavbarPage } from '@/pages/NavbarPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RecommendationsPage } from '@/pages/RecommendationsPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SearchPage } from '@/pages/SearchPage'
import { StatsPage } from '@/pages/StatsPage'
import { FRIEND_STATE } from '@/support/auth-state'
import { THROWAWAY_TITLES, type ThrowawayKey } from '@/support/test-data'

/**
 * The only place specs import `test` / `expect` from.
 *
 * Whether `page` is signed in is decided by the project (playwright.config.ts): `user` and
 * `logout` load .auth/user.json, `guest` starts without a session.
 */

export interface AddedThrowaway {
  /** `/media/<id>` of the freshly added library row */
  mediaUrl: string
  /** Title as the library card shows it */
  title: string
}

type Fixtures = {
  libraryPage: LibraryPage
  searchPage: SearchPage
  mediaPage: MediaPage
  navbar: NavbarPage
  loginPage: LoginPage
  registerPage: RegisterPage
  statsPage: StatsPage
  communityPage: CommunityPage
  profilePage: ProfilePage
  recommendationsPage: RecommendationsPage
  /** A page signed in as the second test user (TEST_USER2_*), in its own browser context. */
  friendPage: Page
  /**
   * Adds the area's throwaway title (support/test-data.ts) to the user's library through the
   * search UI and deletes it through the library UI in teardown. Any leftover row of the same
   * title (an interrupted run) is deleted first, so the test always starts from a fresh row with
   * the default status and no progress. Adds 60 s to the test timeout per call.
   */
  throwawayTitle: (key: ThrowawayKey) => Promise<AddedThrowaway>
  /** CI only: keeps the page snapshot with form values out of the public report (see below). */
  _noPageSnapshotInCI: void
}

export const test = base.extend<Fixtures>({
  /**
   * On a failure Playwright writes an ARIA snapshot of the page into error-context.md — with the
   * VALUES of form fields, password inputs included. CI uploads the report from a public repo, and
   * a failed login put the test account's password there. Playwright 1.56 has no option for it, but
   * it skips the snapshot when the test already has an `error-context` attachment: this auto fixture
   * adds a placeholder one. Its teardown runs before Playwright's own artifact fixture finishes.
   */
  _noPageSnapshotInCI: [
    async ({}, use, testInfo) => {
      await use()
      if (process.env.CI && testInfo.errors.length > 0) {
        await testInfo.attach('error-context', {
          body: 'Page snapshot is disabled in CI: it records form values, passwords included.',
          contentType: 'text/plain',
        })
      }
    },
    { auto: true },
  ],

  libraryPage: async ({ page }, use) => use(new LibraryPage(page)),
  searchPage: async ({ page }, use) => use(new SearchPage(page)),
  mediaPage: async ({ page }, use) => use(new MediaPage(page)),
  navbar: async ({ page }, use) => use(new NavbarPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  statsPage: async ({ page }, use) => use(new StatsPage(page)),
  communityPage: async ({ page }, use) => use(new CommunityPage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),
  recommendationsPage: async ({ page }, use) => use(new RecommendationsPage(page)),

  friendPage: async ({ browser }, use) => {
    // Inside a test browser.newContext() inherits the project's `use` (baseURL, headers, …);
    // only the session is swapped for the friend's
    const context = await browser.newContext({ storageState: FRIEND_STATE })
    try {
      await use(await context.newPage())
    } finally {
      await context.close()
    }
  },

  throwawayTitle: [
    async ({ page }, use, testInfo) => {
      const used = new Set<string>()

      await use(async (key) => {
        const { query, kind, tmdbId, title } = THROWAWAY_TITLES[key]
        testInfo.setTimeout(testInfo.timeout + 60_000)
        // Registered before adding: a half-finished add is cleaned up too
        used.add(title)
        const library = new LibraryPage(page)
        await library.removeByTitle(title)
        await new SearchPage(page).ensureAdded(query, kind, tmdbId)
        return { mediaUrl: await library.mediaUrlOf(title), title }
      })

      if (used.size === 0) return
      // A separate tab: the test's page may hold page.route() mocks or an open dialog
      const cleanup = await page.context().newPage()
      try {
        const library = new LibraryPage(cleanup)
        for (const title of used) await library.removeByTitle(title)
      } finally {
        await cleanup.close()
      }
    },
    // Own timeout for the teardown, separate from the test's
    { timeout: 60_000 },
  ],
})

export { expect } from '@playwright/test'
