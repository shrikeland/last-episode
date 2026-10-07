// Full life of a title on the area's throwaway title (THROWAWAY_TITLES.library, «Ход королевы»).
// Not the throwawayTitle fixture: adding through the dialog IS the test. Leftovers are removed
// before the test and in `finally`, so an interrupted run leaves nothing behind.
// Replaces TC-SEARCH-005+007 (Severance) and the old TC-LIB-004 (Koyaanisqatsi).
import { test, expect } from '@/fixtures'
import { THROWAWAY_TITLES } from '@/support/test-data'

const { query, kind, tmdbId, title } = THROWAWAY_TITLES.library

test('TC-LIB-004: add from search with a status → card in library → delete removes it', async ({ page, searchPage, libraryPage }) => {
  test.setTimeout(90_000)
  await libraryPage.removeByTitle(title)

  try {
    // TC-SEARCH-005: add through the dialog with a non-default status
    await searchPage.goto()
    await searchPage.search(query)
    const result = searchPage.resultCard(kind, tmdbId)
    await expect(searchPage.resultTitle(result)).toHaveText(title)
    await expect(searchPage.addButton(result)).toBeEnabled()

    const dialog = await searchPage.openAddDialog(result)
    await expect(dialog).toContainText(title)
    await searchPage.chooseDialogStatus('Отложено')
    await searchPage.confirmAdd()

    await expect(searchPage.addedToast(title)).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(searchPage.addedButton(result)).toBeDisabled()

    // TC-SEARCH-007: a fresh search (reload of /search?q=…) knows the title is in the library
    await expect(page).toHaveURL(/\/search\?q=/)
    await page.reload()
    await expect(searchPage.addedButton(result)).toBeVisible()

    // The card is in the library with the status chosen in the dialog
    await libraryPage.goto(title)
    const card = libraryPage.card(title)
    await expect(card).toBeVisible()
    await expect(card).toContainText('Отложено')
    await expect(card).toContainText('Сериал')

    // TC-LIB-004: delete
    await libraryPage.deleteCard(card)
    await expect(page.getByText('Удалено из коллекции')).toBeVisible()
    await expect(libraryPage.cardsByTitle(title)).toHaveCount(0)
    await page.reload()
    await expect(libraryPage.foundCount).toContainText('Найдено: 0')
    await expect(libraryPage.cardsByTitle(title)).toHaveCount(0)

    // …and search offers to add it again
    await searchPage.goto()
    await searchPage.search(query)
    await expect(searchPage.addButton(result)).toBeEnabled()
  } finally {
    await libraryPage.removeByTitle(title)
  }
})
