import { test, expect } from '@/fixtures'
import type { DockItem } from '@/pages/NavbarPage'
import { waitForHydration } from '@/support/actions'

/**
 * App chrome from app/(app)/layout.tsx: the bottom AppDock, the navbar logo and the account menu.
 * Read-only — nothing here changes data.
 */

/** Dock item → where it leads and the page's h1. Starts on /library, so the library comes last. */
const DOCK_ROUTES: { item: DockItem; path: string; heading: string }[] = [
  { item: 'Найти', path: '/search', heading: 'Поиск' },
  { item: 'Статистика', path: '/stats', heading: 'Статистика' },
  { item: 'Для тебя', path: '/recommendations', heading: 'Для тебя' },
  { item: 'Сообщество', path: '/community', heading: 'Сообщество' },
  { item: 'Библиотека', path: '/library', heading: 'Библиотека' },
]

test('TC-NAV-001: every AppDock item opens its page', { tag: '@smoke' }, async ({ page, navbar }) => {
  await page.goto('/library', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Библиотека' })).toBeVisible()

  for (const { item, path, heading } of DOCK_ROUTES) {
    await test.step(`${item} → ${path}`, async () => {
      await navbar.clickDockItem(item)
      await expect(page).toHaveURL((url) => url.pathname === path)
      await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible()
    })
  }
})

test('TC-NAV-002: navbar logo leads to /library', async ({ page, navbar }) => {
  await page.goto('/stats', { waitUntil: 'domcontentloaded' })
  await waitForHydration(navbar.logo)
  await navbar.logo.click()
  await expect(page).toHaveURL((url) => url.pathname === '/library')
  await expect(page.getByRole('heading', { level: 1, name: 'Библиотека' })).toBeVisible()
})

test('TC-NAV-003: account menu «Профиль» opens own profile', async ({ page, navbar }) => {
  await page.goto('/library', { waitUntil: 'domcontentloaded' })
  const username = await navbar.getOwnUsername()

  await navbar.openAccountMenu()
  await navbar.profileMenuLink.click()
  await expect(page).toHaveURL((url) => url.pathname === `/profile/${encodeURIComponent(username)}`)
  await expect(page.getByRole('heading', { level: 1, name: `@${username}` })).toBeVisible()
})
