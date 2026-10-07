import { test, expect } from '@/fixtures'

test('TC-STATS-001: stats page loads with time overview', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/stats', { waitUntil: 'networkidle' })
  await expect(page.locator('h1').filter({ hasText: 'Статистика' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/Общее время просмотра/)).toBeVisible()
})
