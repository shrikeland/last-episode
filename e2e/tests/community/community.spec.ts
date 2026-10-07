import { test, expect } from '@/fixtures'
import { NavbarPage } from '@/pages/NavbarPage'

test('TC-COMM-001: community page loads with user search input', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/community', { waitUntil: 'networkidle' })
  await expect(page.getByPlaceholder('Найти пользователя по логину...')).toBeVisible({ timeout: 15000 })
})

test('TC-COMM-002: searching own username shows own user card', async ({ page }) => {
  await page.goto('/community', { waitUntil: 'networkidle' })
  // Own username is a guaranteed hit, unlike an arbitrary query against prod data
  const username = await new NavbarPage(page).getOwnUsername()
  await page.getByPlaceholder('Найти пользователя по логину...').fill(username)
  // Search is debounced (400 ms) and then calls a server action on prod — poll instead of a fixed sleep.
  // "Новые пользователи" hide as soon as the query is non-empty, so a card here comes from search results.
  await expect(page.getByRole('link', { name: `@${username}` }).first()).toBeVisible({ timeout: 15000 })
})
