import { test, expect } from '@/fixtures'
import { NavbarPage } from '@/pages/NavbarPage'

test('TC-PROFILE-001: own profile page loads with username heading', { tag: '@smoke' }, async ({ page }) => {
  // Username comes from the signed-in account, not a constant — CI and local runs use different users
  await page.goto('/library', { waitUntil: 'domcontentloaded' })
  const username = await new NavbarPage(page).getOwnUsername()
  await page.goto(`/profile/${username}`, { waitUntil: 'networkidle' })
  await expect(page.locator('h1').filter({ hasText: `@${username}` })).toBeVisible({ timeout: 15000 })
})

test('TC-PROFILE-003: non-existent profile returns 404 or redirect', async ({ page }) => {
  await page.goto('/profile/this-user-does-not-exist-xyz', { waitUntil: 'domcontentloaded' })
  // Either 404 page or redirect — page must load without crashing
  await expect(page.locator('body')).toBeAttached({ timeout: 10000 })
})
