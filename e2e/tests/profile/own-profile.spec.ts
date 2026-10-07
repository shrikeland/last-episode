import { test, expect } from '@/fixtures'

/**
 * The signed-in user's own profile, /profile/<username>. Read-only. Other users' profiles and
 * the friend comparison blocks are covered by the social specs.
 */

/** SEED_TITLES (support/test-data.ts) as TMDB ru-RU names them, by profile section. */
const SEEDED = {
  Фильм: ['Начало', 'Интерстеллар'],
  Сериал: ['Чернобыль'],
}

test('TC-PROFILE-001: own profile shows @username, stats and the seeded library', { tag: '@smoke' }, async ({
  page,
  navbar,
}) => {
  // Username comes from the signed-in account, not a constant — CI and local runs use different users
  await page.goto('/library', { waitUntil: 'domcontentloaded' })
  const username = await navbar.getOwnUsername()

  await page.goto(`/profile/${encodeURIComponent(username)}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: `@${username}` })).toBeVisible()
  await expect(page.getByText(/^На сайте с /)).toBeVisible()

  await test.step('stats block', async () => {
    await expect(page.getByRole('heading', { level: 2, name: 'Статистика' })).toBeVisible()
    await expect(page.getByText('Общее время просмотра')).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'По статусу' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'Топ жанры' })).toBeVisible()
    // Read-only on a profile: the rows are not links into «my» library (StatsBreakdown `linkable`)
    await expect(page.getByTestId('stats-status-link')).toHaveCount(0)
  })

  await test.step('library sections with the seeded titles', async () => {
    await expect(page.getByRole('heading', { level: 2, name: 'Библиотека' })).toBeVisible()
    for (const [section, titles] of Object.entries(SEEDED)) {
      await expect(page.getByRole('heading', { level: 3, name: section, exact: true })).toBeVisible()
      for (const title of titles) {
        const card = page.getByRole('link', { name: `Открыть ${title}`, exact: true })
        await expect(card).toBeVisible()
        await expect(card).toHaveAttribute('href', new RegExp(`^/profile/[^/]+/media/[0-9a-f-]{36}$`))
      }
    }
  })
})

test('TC-PROFILE-003: unknown username renders the 404 page inside the app shell', async ({ page, navbar }) => {
  const username = `e2e-no-such-user-${Date.now()}`
  await page.goto(`/profile/${username}`, { waitUntil: 'domcontentloaded' })

  // No app/not-found.tsx: notFound() renders Next's default 404. The page streams under
  // app/(app)/loading.tsx, so the HTTP status is already 200 — the 404 is only in the content.
  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'This page could not be found.' })).toBeVisible()
  await expect(page).toHaveTitle(/404/)
  await expect(page.getByRole('heading', { name: `@${username}` })).toHaveCount(0)
  // The layout survived: no error boundary (app/(app)/error.tsx), the navbar is still there
  await expect(page.getByText('Что-то пошло не так')).toHaveCount(0)
  await navbar.assertVisible()
})
