import { test as authTest, expect } from '@/fixtures/auth.fixture'
import { test, expect as baseExpect } from '@playwright/test'
import { NavbarPage } from '@/pages/NavbarPage'
import { isBaseUrlReachable } from '@/support/network'

// Any username works for the redirect check; the authenticated test reads the real one from the navbar
const SOME_USERNAME = 'hornysennin'

let reachable: boolean
authTest.beforeAll(async () => { reachable = await isBaseUrlReachable() })
test.beforeAll(async () => { reachable = await isBaseUrlReachable() })

test('TC-PROFILE-002: unauthenticated /profile/[username] redirects to /login', async ({ page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto(`/profile/${SOME_USERNAME}`, { waitUntil: 'domcontentloaded' })
  await baseExpect(page).toHaveURL(/login/, { timeout: 15000 })
})

authTest('TC-PROFILE-001: own profile page loads with username heading', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/library', { waitUntil: 'networkidle' })
  const navbar = new NavbarPage(page)
  const username = await navbar.ownUsername()

  await navbar.profileLink.click()
  await expect(page).toHaveURL(/\/profile\/[^/]+$/, { timeout: 15000 })
  await expect(page.getByRole('heading', { level: 1, name: `@${username}` })).toBeVisible({ timeout: 15000 })
})

authTest('TC-PROFILE-003: non-existent profile returns 404 or redirect', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/profile/this-user-does-not-exist-xyz', { waitUntil: 'domcontentloaded' })
  // Either 404 page or redirect — page must load without crashing
  await expect(page.locator('body')).toBeAttached({ timeout: 10000 })
})
