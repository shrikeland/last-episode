import { test, expect } from '@/fixtures'
import { NavbarPage } from '@/pages/NavbarPage'

/**
 * TC-AUTH-010: logout — user can sign out and is redirected to /login
 *
 * signOut() defaults to scope 'global' and revokes every session of the test user, so this
 * spec is its own project (`logout`) that depends on `user` and runs after everything else.
 * The next run's auth.setup.ts logs in again.
 */
test('TC-AUTH-010: logout redirects to /login and clears session', async ({ page }) => {
  await page.goto('/library', { waitUntil: 'networkidle' })
  await new NavbarPage(page).logout()
  await expect(page).toHaveURL(/login/, { timeout: 10000 })

  // After logout, navigating to a protected route should redirect back to /login
  await page.goto('/library', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/login/, { timeout: 15000 })
})
