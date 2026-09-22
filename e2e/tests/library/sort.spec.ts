import { test, expect } from '@/fixtures/auth.fixture'
import { LibraryPage } from '@/pages/LibraryPage'
import { MediaPage } from '@/pages/MediaPage'
import { SearchPage } from '@/pages/SearchPage'
import { isBaseUrlReachable } from '@/support/network'

let reachable: boolean

test.beforeAll(async () => {
  reachable = await isBaseUrlReachable()
})

const SEED_MOVIES = ['Inception', 'Interstellar']

function cardId(testId: string | null): string {
  return (testId ?? '').replace('media-card-', '')
}

test('TC-LIB-SORT-001: default sort is "Недавно добавленные"', async ({ authenticatedPage: page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()
  await expect(page.getByTestId('library-sort')).toContainText('Недавно добавленные')
})

test('TC-LIB-SORT-002: unknown sort param falls back to default instead of crashing', async ({ authenticatedPage: page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)
  await page.goto('/library?sort=foo&dir=sideways', { waitUntil: 'networkidle' })
  await library.waitForCards()
  await expect(page.getByTestId('library-sort')).toContainText('Недавно добавленные')
})

test('TC-LIB-SORT-003: changing a title\'s status moves it to the top of "Недавно обновлённые"', async ({ authenticatedPage: page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  const library = new LibraryPage(page)

  // Фильтр по типу даёт плоский список без секций — порядок читается напрямую
  const url = '/library?type=movie&sort=updated_at&dir=desc'
  await page.goto(url, { waitUntil: 'networkidle' })

  // Библиотеку тестового аккаунта подъедают другие тесты (TC-LIB-004 удаляет карточку) —
  // доводим её до двух фильмов через поиск
  if ((await library.cards().count()) < 2) {
    const search = new SearchPage(page)
    for (const title of SEED_MOVIES) {
      await search.goto()
      await search.search(title)
      const card = await search.waitForResults()
      if (await card.getByRole('button', { name: 'Добавить' }).isVisible()) {
        await search.clickAddOnFirstResult()
        await search.confirmAdd()
        await search.assertFirstCardAdded()
      }
    }
    await page.goto(url, { waitUntil: 'networkidle' })
  }
  await library.waitForCards()
  expect(await library.cards().count()).toBeGreaterThanOrEqual(2)

  await expect(page.getByTestId('library-sort')).toContainText('Недавно обновлённые')
  const lastId = cardId(await library.cards().last().getAttribute('data-testid'))
  expect(cardId(await library.firstCard().getAttribute('data-testid'))).not.toBe(lastId)

  // Меняем статус туда и обратно: данные теста не меняются, updated_at сдвигается
  await page.goto(`/media/${lastId}`, { waitUntil: 'networkidle' })
  const media = new MediaPage(page)
  await media.waitForLoad()
  const original = ((await media.statusSelect.textContent()) ?? '').trim()
  await media.changeStatus(original === 'Отложено' ? 'Брошено' : 'Отложено')
  await media.changeStatus(original)
  await expect(media.statusSelect).toContainText(original)

  await page.goto(url, { waitUntil: 'networkidle' })
  await library.waitForCards()
  expect(cardId(await library.firstCard().getAttribute('data-testid'))).toBe(lastId)
})
