// Read-only library tests on the seeded titles (SEED_TITLES, tests/setup/seed.setup.ts).
// Statuses of seed titles are not asserted — other areas change them; types and genres are stable.
import { test, expect } from '@/fixtures'

// Seed titles as the library cards show them (TMDB ru-RU)
const INCEPTION = 'Начало'
const INTERSTELLAR = 'Интерстеллар'
const CHERNOBYL = 'Чернобыль'

test('TC-LIB-001: library page shows media cards', { tag: '@smoke' }, async ({ libraryPage }) => {
  await libraryPage.goto()
  await expect(libraryPage.card(INCEPTION)).toBeVisible()
  await expect(libraryPage.cards()).not.toHaveCount(0)
})

test('TC-LIB-002: a filter without matches shows the empty state, «Сбросить фильтры» clears it', async ({ page, libraryPage }) => {
  await libraryPage.goto()
  await expect(libraryPage.card(INCEPTION)).toBeVisible()

  await libraryPage.filterByText('zzzunlikelymatch')
  await expect(libraryPage.foundCount).toContainText('Найдено: 0')
  await expect(libraryPage.cards()).toHaveCount(0)
  await expect(libraryPage.noResults).toBeVisible()

  await libraryPage.resetFiltersButton.click()
  await expect(page).toHaveURL(/\/library$/)
  await expect(libraryPage.searchInput).toHaveValue('')
  await expect(libraryPage.foundCount).toBeHidden()
  await expect(libraryPage.card(INCEPTION)).toBeVisible()
})

test('TC-LIB-003: status filter shows only cards with that status', async ({ page, libraryPage }) => {
  await libraryPage.goto()
  await libraryPage.filterByStatus('Хочу посмотреть')
  await expect(page).toHaveURL(/status=planned/)
  await expect(libraryPage.foundCount).toBeVisible()
  // Which titles are «planned» right now is up to other tests — but none of the others may show up
  await expect(libraryPage.cardsWithoutStatus('Хочу посмотреть')).toHaveCount(0)
})

test('TC-LIB-005: cancel delete keeps card in library', async ({ page, libraryPage }) => {
  await libraryPage.goto(INCEPTION)
  const card = libraryPage.card(INCEPTION)
  await expect(card).toBeVisible()

  await libraryPage.cancelDelete(card)

  await expect(card).toBeVisible()
  await page.reload()
  await expect(card).toBeVisible()
})

test('TC-LIB-006: clicking card navigates to /media/[id]', { tag: '@smoke' }, async ({ page, libraryPage }) => {
  await libraryPage.goto()
  await libraryPage.openCard(libraryPage.card(INCEPTION))
  await expect(page).toHaveURL(/\/media\//)
  await expect(page.getByRole('heading', { level: 1, name: INCEPTION })).toBeVisible()
})

test('TC-LIB-009: type filter «Сериал» shows only shows', async ({ page, libraryPage }) => {
  await libraryPage.goto()
  await libraryPage.filterByType('Сериал')
  await expect(page).toHaveURL(/type=tv/)

  await expect(libraryPage.card(CHERNOBYL)).toBeVisible()
  await expect(libraryPage.cardsByTitle(INCEPTION)).toHaveCount(0)
  await expect(libraryPage.cardsByTitle(INTERSTELLAR)).toHaveCount(0)
  await expect(libraryPage.cardsWithoutType('Сериал')).toHaveCount(0)
  await expect(libraryPage.foundCount).toContainText(`Найдено: ${await libraryPage.cards().count()}`)
})

test('TC-LIB-010: genre filter, the counter and «Сбросить»', async ({ page, libraryPage }) => {
  await libraryPage.goto()
  // Chernobyl is a drama, Inception is not (action / sci-fi / adventure)
  await libraryPage.filterByGenre('Драма')
  await expect(page).toHaveURL(/genre=/)

  await expect(libraryPage.card(CHERNOBYL)).toBeVisible()
  await expect(libraryPage.cardsByTitle(INCEPTION)).toHaveCount(0)
  await expect(libraryPage.foundCount).toContainText(`Найдено: ${await libraryPage.cards().count()}`)

  // Filters combine: drama + movies drops the show
  await libraryPage.filterByType('Фильм')
  await expect(page).toHaveURL(/genre=.*type=movie|type=movie.*genre=/)
  await expect(libraryPage.cardsByTitle(CHERNOBYL)).toHaveCount(0)
  await expect(libraryPage.cardsWithoutType('Фильм')).toHaveCount(0)

  await libraryPage.resetLink.click()
  await expect(page).toHaveURL(/\/library$/)
  await expect(libraryPage.foundCount).toBeHidden()
  await expect(libraryPage.card(CHERNOBYL)).toBeVisible()
  await expect(libraryPage.card(INCEPTION)).toBeVisible()
})
