import { test as authTest, expect } from '@/fixtures/auth.fixture'
import { test, expect as baseExpect } from '@playwright/test'
import { isBaseUrlReachable } from '@/support/network'

let reachable: boolean

authTest.beforeAll(async () => { reachable = await isBaseUrlReachable() })
test.beforeAll(async () => { reachable = await isBaseUrlReachable() })

test('TC-STATS-002: unauthenticated /stats redirects to /login', async ({ page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/stats', { waitUntil: 'domcontentloaded' })
  await baseExpect(page).toHaveURL(/login/, { timeout: 15000 })
})

authTest('TC-STATS-001: stats page loads with time overview', { tag: '@smoke' }, async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/stats', { waitUntil: 'networkidle' })
  await expect(page.locator('h1').filter({ hasText: 'Статистика' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/Общее время просмотра/)).toBeVisible()
})
