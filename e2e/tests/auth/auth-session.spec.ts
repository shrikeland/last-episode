import { test as authTest, expect } from '@/fixtures/auth.fixture'
import { NavbarPage } from '@/pages/NavbarPage'
import { isBaseUrlReachable } from '@/support/network'

let reachable: boolean

authTest.beforeAll(async () => {
  reachable = await isBaseUrlReachable()
})

/**
 * TC-AUTH-011: storageState reuse — authenticated page loads /library without re-login
 */
authTest('TC-AUTH-011: stored session opens /library without login', { tag: '@smoke' }, async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/library', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/library/, { timeout: 15000 })
  await new NavbarPage(page).assertVisible()
})

/**
 * TC-AUTH-010: logout — user can sign out and is redirected to /login
 */
authTest('TC-AUTH-010: logout redirects to /login and clears session', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/library', { waitUntil: 'networkidle' })
  await new NavbarPage(page).logout()
  await expect(page).toHaveURL(/login/, { timeout: 10000 })

  // After logout, navigating to a protected route should redirect back to /login
  await page.goto('/library', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/login/, { timeout: 15000 })
})
