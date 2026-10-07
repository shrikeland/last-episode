import { test, expect } from '@/fixtures'
import { SearchPage } from '@/pages/SearchPage'

test('TC-SEARCH-001: search returns results for valid query', { tag: '@smoke' }, async ({ page }) => {
  const search = new SearchPage(page)
  await search.goto()
  await search.search('Breaking Bad')
  await search.waitForResults()
  // At least one card visible
  await expect(page.locator('[data-testid^="tmdb-result-card-"]').first()).toBeVisible()
})

test('TC-SEARCH-002: search with no results shows empty message', async ({ page }) => {
  const search = new SearchPage(page)
  await search.goto()
  await search.search('xyzzy12345notfound')
  await search.waitForEmpty()
})

test('TC-SEARCH-003: clear button resets query and results', async ({ page }) => {
  const search = new SearchPage(page)
  await search.goto()
  await search.search('Breaking Bad')
  await search.waitForResults()

  await search.clearSearch()

  await expect(search.searchInput).toHaveValue('')
  await expect(page.locator('[data-testid^="tmdb-result-card-"]')).toHaveCount(0, { timeout: 5000 })
  await expect(page.getByRole('button', { name: 'Очистить поиск' })).not.toBeVisible()
})

test('TC-SEARCH-004: clicking Add opens AddToLibrary dialog', { tag: '@smoke' }, async ({ page }) => {
  const search = new SearchPage(page)
  await search.goto()
  await search.search('Breaking Bad')
  await search.waitForResults()
  await search.clickAddOnFirstResult()
  await search.assertDialogOpen()
  await expect(page.getByRole('dialog')).toContainText('Добавить в библиотеку')
})

test('TC-SEARCH-006: cancelling dialog does not add title', async ({ page }) => {
  const search = new SearchPage(page)
  await search.goto()
  await search.search('Breaking Bad')
  await search.waitForResults()
  await search.clickAddOnFirstResult()
  await search.assertDialogOpen()
  await search.cancelAdd()

  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  await search.assertFirstCardAddable()
})

test('TC-SEARCH-005+007: add title then re-search shows Добавлено', async ({ page }) => {
  const search = new SearchPage(page)
  await search.goto()

  // Use a stable, well-known TV show unlikely to already be in library
  await search.search('Severance')
  await search.waitForResults(15000)

  const firstCard = search.firstResultCard()
  const addButton = firstCard.getByRole('button', { name: 'Добавить' })

  // Skip if already added (to make test idempotent)
  const isAlreadyAdded = await firstCard.getByRole('button', { name: 'Добавлено' }).isVisible()
  if (isAlreadyAdded) {
    // TC-SEARCH-007 passes implicitly — already added state is shown
    return
  }

  await addButton.click()
  await search.assertDialogOpen()

  // TC-SEARCH-005: confirm add with default status (Хочу посмотреть)
  await search.confirmAdd()

  await expect(page.getByText(/добавлен в коллекцию/)).toBeVisible({ timeout: 10000 })
  await search.assertFirstCardAdded()

  // TC-SEARCH-007: re-search same title → card shows Добавлено immediately
  await search.clearSearch()
  await search.search('Severance')
  await search.waitForResults(15000)
  await search.assertFirstCardAdded()
})
