import { test, expect } from '@/fixtures'

/**
 * The stored session of project `user` (.auth/user.json). Read-only: nothing here signs out —
 * signOut() is global and would revoke the session of every parallel run (see logout.spec.ts).
 */

test('TC-AUTH-011: stored session opens /library without login', { tag: '@smoke' }, async ({ page, navbar }) => {
  await page.goto('/library', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL((url) => url.pathname === '/library')
  await expect(page.getByRole('heading', { level: 1, name: 'Библиотека' })).toBeVisible()
  await navbar.assertVisible()
})

/**
 * proxy.ts: a signed-in request to an auth page (/login, /register, /auth/*) is redirected to
 * /library before the page renders.
 */
const AUTH_PAGES = [
  { id: 'TC-AUTH-015', path: '/login' },
  { id: 'TC-AUTH-016', path: '/register' },
]

for (const { id, path } of AUTH_PAGES) {
  // One auth page is enough for the PR smoke run — both go through the same proxy.ts branch
  test(`${id}: signed-in user on ${path} is redirected to /library`, path === '/login' ? { tag: '@smoke' } : {}, async ({ page, navbar }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL((url) => url.pathname === '/library')
    // The redirect came from the server (proxy.ts), not from a client-side router.push after render
    expect(response?.request().redirectedFrom()?.url(), 'no server-side redirect').toContain(path)
    await expect(page.getByRole('heading', { level: 1, name: 'Библиотека' })).toBeVisible()
    await navbar.assertVisible()
  })
}
