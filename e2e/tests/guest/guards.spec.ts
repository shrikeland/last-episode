import { test, expect } from '@/fixtures'

/**
 * Auth guard: a guest opening any page of the (app) group lands on /login (proxy.ts redirects
 * every signed-out request outside the auth pages; app/(app)/layout.tsx is the second layer).
 * Replaces TC-AUTH-004/004b, TC-LIB-007, TC-MEDIA-006, TC-SEARCH-008, TC-STATS-002,
 * TC-COMM-003, TC-REC-003 and TC-PROFILE-002.
 */
const PROTECTED_PATHS = [
  '/library',
  '/search',
  '/stats',
  '/recommendations',
  '/community',
  // Any username / id works — the redirect happens before the row is looked up
  '/profile/x',
  '/media/00000000-0000-0000-0000-000000000000',
]

for (const path of PROTECTED_PATHS) {
  test(
    `TC-AUTH-004: guest on ${path} is redirected to /login`,
    // One route is enough for the PR smoke run — they all go through the same proxy.ts branch
    path === '/library' ? { tag: '@smoke' } : {},
    async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
      await expect(page.getByTestId('login-form')).toBeVisible()
    },
  )
}
