import { test, expect } from '@/fixtures'
import { NavbarPage } from '@/pages/NavbarPage'

/**
 * TC-AUTH-011: storageState reuse — authenticated page loads /library without re-login
 */
test('TC-AUTH-011: stored session opens /library without login', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/library', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/library/, { timeout: 15000 })
  await new NavbarPage(page).assertVisible()
})
