import { test as authTest, expect } from '@/fixtures/auth.fixture'
import { test, expect as baseExpect } from '@playwright/test'
import { LibraryPage } from '@/pages/LibraryPage'
import { SearchPage } from '@/pages/SearchPage'
import { isBaseUrlReachable } from '@/support/network'

let reachable: boolean

authTest.beforeAll(async () => {
  reachable = await isBaseUrlReachable()
})

test.beforeAll(async () => {
  reachable = await isBaseUrlReachable()
})

// ─── Unauthenticated ─────────────────────────────────────────────────────────

test('TC-LIB-007: unauthenticated /library redirects to /login', async ({ page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/library', { waitUntil: 'domcontentloaded' })
  await baseExpect(page).toHaveURL(/login/, { timeout: 15000 })
})

// ─── Authenticated library tests ─────────────────────────────────────────────

authTest('TC-LIB-001: library page shows media cards', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()
  await expect(library.cards()).not.toHaveCount(0)
})

authTest('TC-LIB-002: text filter narrows results and updates URL', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()

  const countBefore = await library.cards().count()
  // Filter by something unlikely to match everything
  await library.filterByText('zzzunlikelymatch')
  await expect(page).toHaveURL(/search=zzzunlikelymatch/, { timeout: 5000 })
  const countAfter = await library.cards().count()
  expect(countAfter).toBeLessThanOrEqual(countBefore)
})

authTest('TC-LIB-003: status filter updates URL', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()
  await library.filterByStatus('Хочу посмотреть')
  await expect(page).toHaveURL(/status=planned/, { timeout: 8000 })
})

authTest('TC-LIB-005: cancel delete keeps card in library', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()

  const countBefore = await library.cards().count()
  await library.cancelDeleteFirstCard()

  await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 5000 })
  const countAfter = await library.cards().count()
  expect(countAfter).toBe(countBefore)
})

authTest('TC-LIB-006: clicking card navigates to /media/[id]', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()
  await library.clickFirstCardLink()
  await expect(page).toHaveURL(/\/media\//, { timeout: 15000 })
})

// Throwaway title TC-LIB-004 adds and deletes itself, so the test account's library
// doesn't shrink run over run. The library filter also matches original_title.
const THROWAWAY_TITLE = 'Koyaanisqatsi'

authTest('TC-LIB-004: delete item removes card from library', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')

  // Arrange: add the throwaway title (may already be there after an interrupted run)
  const search = new SearchPage(page)
  await search.goto()
  await search.search(THROWAWAY_TITLE)
  await search.waitForResults(15000)
  await search.ensureFirstResultAdded()

  const library = new LibraryPage(page)
  await library.goto(THROWAWAY_TITLE)
  await library.waitForCards()
  const countBefore = await library.cards().count()

  await library.deleteFirstCard()

  // Wait for card to disappear
  await expect(library.cards()).toHaveCount(countBefore - 1, { timeout: 10000 })
})
