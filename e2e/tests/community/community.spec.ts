import { test as authTest, expect } from '@/fixtures/auth.fixture'
import { test, expect as baseExpect } from '@playwright/test'
import { isBaseUrlReachable } from '@/support/network'
import { NavbarPage } from '@/pages/NavbarPage'

let reachable: boolean
authTest.beforeAll(async () => { reachable = await isBaseUrlReachable() })
test.beforeAll(async () => { reachable = await isBaseUrlReachable() })

test('TC-COMM-003: unauthenticated /community redirects to /login', async ({ page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/community', { waitUntil: 'domcontentloaded' })
  await baseExpect(page).toHaveURL(/login/, { timeout: 15000 })
})

authTest('TC-COMM-001: community page loads with user search input', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/community', { waitUntil: 'networkidle' })
  await expect(page.getByPlaceholder('Найти пользователя по логину...')).toBeVisible({ timeout: 15000 })
})

authTest('TC-COMM-002: searching own username shows own user card', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/community', { waitUntil: 'networkidle' })
  // Own username is a guaranteed hit, unlike an arbitrary query against prod data
  const username = await new NavbarPage(page).getOwnUsername()
  await page.getByPlaceholder('Найти пользователя по логину...').fill(username)
  // Search is debounced (400 ms) and then calls a server action on prod — poll instead of a fixed sleep.
  // "Новые пользователи" hide as soon as the query is non-empty, so a card here comes from search results.
  await expect(page.getByRole('link', { name: `@${username}` }).first()).toBeVisible({ timeout: 15000 })
})
