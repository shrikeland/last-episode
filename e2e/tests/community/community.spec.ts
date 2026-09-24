import { test as authTest, expect } from '@/fixtures/auth.fixture'
import { test, expect as baseExpect } from '@playwright/test'
import { NavbarPage } from '@/pages/NavbarPage'
import { isBaseUrlReachable } from '@/support/network'

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

authTest('TC-COMM-002: searching a username shows results or empty message', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  // searchUsers doesn't exclude the current user — searching our own username is a guaranteed hit
  await page.goto('/library', { waitUntil: 'networkidle' })
  const username = await new NavbarPage(page).ownUsername()

  await page.goto('/community', { waitUntil: 'networkidle' })
  const input = page.getByPlaceholder('Найти пользователя по логину...')

  // Results are UserCards — links to /profile/<username>. Matched by the exact «@username» line,
  // so longer usernames that contain ours don't count
  await input.fill(username)
  const ownCard = page.getByRole('link').filter({ has: page.getByText(`@${username}`, { exact: true }) })
  await expect(ownCard).toBeVisible({ timeout: 10000 })
  await expect(ownCard).toHaveAttribute('href', `/profile/${encodeURIComponent(username)}`)

  await input.fill('zz-no-such-user-e2e')
  await expect(page.getByText('Пользователи не найдены')).toBeVisible({ timeout: 10000 })
  await expect(ownCard).toHaveCount(0)
})
