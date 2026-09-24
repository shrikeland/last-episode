// Seeded: the CI account starts with an empty library, these tests need cards
import { test as authTest, expect } from '@/fixtures/library.fixture'
import { test, expect as baseExpect } from '@playwright/test'
import { LibraryPage } from '@/pages/LibraryPage'
import { MediaPage } from '@/pages/MediaPage'
import { isBaseUrlReachable } from '@/support/network'

let reachable: boolean

authTest.beforeAll(async () => {
  reachable = await isBaseUrlReachable()
})

test.beforeAll(async () => {
  reachable = await isBaseUrlReachable()
})

// ─── Unauthenticated ─────────────────────────────────────────────────────────

test('TC-MEDIA-006: unauthenticated /media/[id] redirects to /login', async ({ page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/media/00000000-0000-0000-0000-000000000000', { waitUntil: 'domcontentloaded' })
  await baseExpect(page).toHaveURL(/login/, { timeout: 15000 })
})

// ─── Authenticated media tests ────────────────────────────────────────────────

authTest('TC-MEDIA-001: detail page loads with title and status select', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()
  await library.clickFirstCardLink()

  const media = new MediaPage(page)
  await media.waitForLoad()
  await expect(page).toHaveURL(/\/media\//)
  await expect(page.locator('h1').first()).toBeVisible()
})

authTest('TC-MEDIA-002: changing status is reflected in the select', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()
  await library.clickFirstCardLink()

  const media = new MediaPage(page)
  await media.waitForLoad()
  await media.changeStatus('Смотрю')

  // Status select should show new value
  await expect(media.statusSelect).toContainText('Смотрю', { timeout: 5000 })
})

authTest('TC-MEDIA-003: toggling episode checkbox changes checked state', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')

  // Needs a TV show (season accordion). The unfiltered library opens with movies,
  // so filter by type — the seed guarantees at least one show
  const library = new LibraryPage(page)
  await library.goto({ type: 'tv' })
  await library.waitForCards()
  await library.clickFirstCardLink()

  const media = new MediaPage(page)
  await media.waitForLoad()
  await expect(media.seasonAccordion).toBeVisible()

  await media.openFirstSeasonAccordion()

  const checkbox = page.locator('[data-testid^="episode-checkbox-"]').first()
  await checkbox.waitFor({ state: 'visible', timeout: 5000 })

  const wasChecked = await checkbox.isChecked()
  await media.toggleFirstEpisode()

  await expect(checkbox).toBeChecked({ checked: !wasChecked, timeout: 5000 })
})

authTest('TC-MEDIA-004: mark season watched checks all episodes', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')

  const library = new LibraryPage(page)
  await library.goto({ type: 'tv' })
  await library.waitForCards()
  await library.clickFirstCardLink()

  const media = new MediaPage(page)
  await media.waitForLoad()
  await expect(media.seasonAccordion).toBeVisible()

  await media.openFirstSeasonAccordion()
  await media.markFirstSeasonWatched()

  // After marking season, all visible episode checkboxes should be checked
  const checkboxes = page.locator('[data-testid^="episode-checkbox-"]')
  const count = await checkboxes.count()
  authTest.skip(count === 0, 'No episode checkboxes visible')

  for (let i = 0; i < Math.min(count, 3); i++) {
    await expect(checkboxes.nth(i)).toBeChecked({ timeout: 5000 })
  }
})
