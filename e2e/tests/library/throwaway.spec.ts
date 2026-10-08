// Library tests that change data: each runs on a fresh copy of the area's throwaway title
// (throwawayTitle('library') — «Ход королевы», 1 season × 7, status «Хочу посмотреть», no rating,
// no progress; deleted in teardown). Statuses used here never include «Брошено».
import { test, expect } from '@/fixtures'
import { mediaIdOf } from '@/pages/LibraryPage'
import type { MediaPage } from '@/pages/MediaPage'
import { waitForHydration, waitForServerAction } from '@/support/actions'
import type { Page } from '@playwright/test'

/** Status change on the media page, saved before the caller moves on. */
async function setStatus(page: Page, mediaPage: MediaPage, status: string) {
  await waitForHydration(mediaPage.statusSelect)
  await waitForServerAction(page, () => mediaPage.changeStatus(status))
  await expect(mediaPage.statusSelect).toContainText(status)
}

/**
 * Ticks the first episode of the first season and waits for the save.
 * Call it BEFORE a status change: updateStatus re-renders the page (revalidatePath), and when that
 * render lands after the tick, SeasonAccordion resets its episodes to the pre-tick server data —
 * the tick is saved, but the checkbox shows unchecked.
 */
async function watchFirstEpisode(mediaPage: MediaPage) {
  await mediaPage.openFirstSeasonAccordion()
  const first = mediaPage.episodeCheckboxes().first()
  await mediaPage.clickAndSave(first)
  await expect(first).toBeChecked()
}

test('TC-LIB-008: status and rating filters follow the title\'s own status and rating', async ({ page, libraryPage, mediaPage, throwawayTitle }) => {
  const { mediaUrl, title } = await throwawayTitle('library')

  // Fresh row: «Хочу посмотреть», no rating → found by «Без оценки»
  await libraryPage.goto()
  await libraryPage.filterByRating('Без оценки')
  await expect(libraryPage.card(title)).toBeVisible()

  await page.goto(mediaUrl)
  await mediaPage.waitForLoad()
  await setStatus(page, mediaPage, 'Отложено')
  const nine = page.getByTestId('rating-input').getByRole('button', { name: 'Оценка 9', exact: true })
  await waitForServerAction(page, () => nine.click())

  await libraryPage.goto()
  await libraryPage.filterByStatus('Отложено')
  await expect(libraryPage.card(title)).toBeVisible()
  await expect(libraryPage.cardsWithoutStatus('Отложено')).toHaveCount(0)
  await expect(libraryPage.foundCount).toContainText(`Найдено: ${await libraryPage.cards().count()}`)

  await libraryPage.filterByStatus('Хочу посмотреть')
  await expect(libraryPage.foundCount).toBeVisible()
  await expect(libraryPage.cardsByTitle(title)).toHaveCount(0)
  await expect(libraryPage.cardsWithoutStatus('Хочу посмотреть')).toHaveCount(0)

  await libraryPage.filterByStatus('Все статусы')
  await libraryPage.filterByRating('Без оценки')
  await expect(libraryPage.foundCount).toBeVisible()
  await expect(libraryPage.cardsByTitle(title)).toHaveCount(0)

  await libraryPage.filterByRating('8 и выше')
  await expect(libraryPage.card(title)).toBeVisible()
  await expect(libraryPage.card(title)).toContainText('9')
})

test('TC-LIB-011: status and progress changed on the title page show up in the library after «Назад»', async ({ page, libraryPage, mediaPage, throwawayTitle }) => {
  const { title } = await throwawayTitle('library')

  await libraryPage.goto(title)
  const card = libraryPage.card(title)
  await expect(card).toContainText('Хочу посмотреть')
  await expect(libraryPage.cardProgress(card)).toHaveText(/^0\/\d+ эп\.$/)

  // BackButton → router.back(): the library comes back from the client router cache.
  // Two separate trips — each freshness mechanism on its own:
  // 1. episode tick → markLibraryStale → RefreshIfStale refreshes the library
  await libraryPage.openCard(card)
  await mediaPage.waitForLoad()
  await watchFirstEpisode(mediaPage)
  await page.getByRole('button', { name: 'Назад', exact: true }).click()
  await expect(page).toHaveURL(/\/library\?search=/)
  await expect(libraryPage.cardProgress(card)).toHaveText(/^1\/\d+ эп\.$/)
  await expect(card).toContainText('Хочу посмотреть')

  // 2. status change → updateStatus's revalidatePath('/library')
  await libraryPage.openCard(card)
  await mediaPage.waitForLoad()
  await setStatus(page, mediaPage, 'Смотрю')
  await page.getByRole('button', { name: 'Назад', exact: true }).click()
  await expect(page).toHaveURL(/\/library\?search=/)
  await expect(card).toContainText('Смотрю')
  await expect(libraryPage.cardProgress(card)).toHaveText(/^1\/\d+ эп\.$/)
})

test('TC-LIB-012: «Продолжить» shows the next episode of a show in progress and marks it', async ({ page, libraryPage, mediaPage, throwawayTitle }) => {
  const { mediaUrl, title } = await throwawayTitle('library')

  await page.goto(mediaUrl)
  await mediaPage.waitForLoad()
  await watchFirstEpisode(mediaPage)
  await setStatus(page, mediaPage, 'Смотрю')

  await libraryPage.goto()
  const card = libraryPage.continueCard(mediaIdOf(mediaUrl))
  await expect(card).toContainText(title)
  await expect(card).toContainText('S1 · E02')
  const mark = libraryPage.continueMarkButton(card)
  await expect(mark).toHaveAccessibleName(`Отметить просмотренной: ${title}, S1 · E02`)

  await waitForServerAction(page, () => mark.click())
  await expect(card).toContainText('S1 · E03')
  await expect(mark).toHaveAccessibleName(`Отметить просмотренной: ${title}, S1 · E03`)

  // Saved, not just optimistic: after a reload the row and the library card agree
  await page.reload()
  await expect(card).toContainText('S1 · E03')
  await expect(libraryPage.cardProgress(libraryPage.card(title))).toHaveText(/^2\/\d+ эп\.$/)
})
