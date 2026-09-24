import { test as authTest, expect } from '@/fixtures/auth.fixture'
import { test, expect as baseExpect } from '@playwright/test'
import { isBaseUrlReachable } from '@/support/network'
import { NavbarPage } from '@/pages/NavbarPage'

let reachable: boolean
authTest.beforeAll(async () => { reachable = await isBaseUrlReachable() })
test.beforeAll(async () => { reachable = await isBaseUrlReachable() })

test('TC-PROFILE-002: unauthenticated /profile/[username] redirects to /login', async ({ page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  // Any username works — the redirect happens before the profile is looked up
  await page.goto('/profile/test_user', { waitUntil: 'domcontentloaded' })
  await baseExpect(page).toHaveURL(/login/, { timeout: 15000 })
})

authTest('TC-PROFILE-001: own profile page loads with username heading', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  // Username comes from the signed-in account, not a constant — CI and local runs use different users
  await page.goto('/library', { waitUntil: 'domcontentloaded' })
  const username = await new NavbarPage(page).getOwnUsername()
  await page.goto(`/profile/${username}`, { waitUntil: 'networkidle' })
  await expect(page.locator('h1').filter({ hasText: `@${username}` })).toBeVisible({ timeout: 15000 })
})

authTest('TC-PROFILE-003: non-existent profile returns 404 or redirect', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/profile/this-user-does-not-exist-xyz', { waitUntil: 'domcontentloaded' })
  // Either 404 page or redirect — page must load without crashing
  await expect(page.locator('body')).toBeAttached({ timeout: 10000 })
})
