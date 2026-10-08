// The title page outside the episode tracker (episodes.spec.ts): status, rating, notes, genres,
// navigation, 404. Tests that change data run on a fresh copy of the area's throwaway title
// (throwawayTitle('media') — «Дрянь», 2 seasons × 6, status «Хочу посмотреть», no rating, no notes;
// deleted in teardown). Every saved value is checked after a reload. «Брошено» is never used here:
// it is reserved for the stats delta test.
import { test, expect } from '@/fixtures'
import { waitForHydration } from '@/support/actions'

test('TC-MEDIA-001: detail page loads with title and status select', async ({ page, libraryPage, mediaPage }) => {
  // Read-only: the first card of the seeded library
  await libraryPage.goto()
  await libraryPage.waitForCards()
  await libraryPage.clickFirstCardLink()

  await expect(page).toHaveURL(/\/media\//)
  await mediaPage.waitForLoad()
  await expect(mediaPage.heading).not.toBeEmpty()
})

test('TC-MEDIA-002: changing status is reflected in the select and saved', { tag: '@smoke' }, async ({
  page,
  mediaPage,
  throwawayTitle,
}) => {
  const { mediaUrl } = await throwawayTitle('media')
  await page.goto(mediaUrl)
  await mediaPage.waitForLoad()
  await expect(mediaPage.statusSelect).toHaveText('Хочу посмотреть')

  await mediaPage.setStatus('Смотрю')

  await page.reload()
  await mediaPage.waitForLoad()
  await expect(mediaPage.statusSelect).toHaveText('Смотрю')
})

test('TC-MEDIA-005: notes are saved and survive a reload', async ({ page, mediaPage, throwawayTitle }) => {
  const { mediaUrl } = await throwawayTitle('media')
  await page.goto(mediaUrl)
  await mediaPage.waitForLoad()
  await expect(mediaPage.notesEditor).toHaveValue('')

  // NotesEditor saves on its own 1.5 s after the last keystroke — no blur or button
  const notes = `e2e: заметка ${Date.now()}\nвторая строка`
  await mediaPage.saveNotes(notes)

  await page.reload()
  await mediaPage.waitForLoad()
  await expect(mediaPage.notesEditor).toHaveValue(notes)

  // An emptied field is saved as «no notes»
  await mediaPage.saveNotes('')
  await page.reload()
  await mediaPage.waitForLoad()
  await expect(mediaPage.notesEditor).toHaveValue('')
})

test('TC-MEDIA-008: rating is saved, survives a reload and is cleared by clicking it again', async ({
  page,
  mediaPage,
  throwawayTitle,
}) => {
  const { mediaUrl } = await throwawayTitle('media')
  await page.goto(mediaUrl)
  await mediaPage.waitForLoad()
  await expect(mediaPage.ratingValue).toHaveText('—')

  // A half star: the value goes through as 7.5, not rounded
  await mediaPage.clickRating(7.5)
  await expect(mediaPage.ratingValue).toHaveText('7.5 / 10')

  await page.reload()
  await mediaPage.waitForLoad()
  await expect(mediaPage.ratingValue).toHaveText('7.5 / 10')

  await mediaPage.clickRating(7.5)
  await expect(mediaPage.ratingValue).toHaveText('—')

  await page.reload()
  await mediaPage.waitForLoad()
  await expect(mediaPage.ratingValue).toHaveText('—')
})

test('TC-MEDIA-011: a genre badge opens the library filtered by it; «Назад» on the title returns there', async ({
  page,
  mediaPage,
  libraryPage,
  throwawayTitle,
}) => {
  const { mediaUrl, title } = await throwawayTitle('media')
  await page.goto(mediaUrl)
  await mediaPage.waitForLoad()

  const genreLink = mediaPage.genreLinks().first()
  const genreName = (await genreLink.innerText()).trim()
  const genre = new URL((await genreLink.getAttribute('href'))!, page.url()).searchParams.get('genre')
  expect(genre, 'genre link has ?genre=').toBeTruthy()
  const isFilteredLibrary = (url: URL) => url.pathname === '/library' && url.searchParams.get('genre') === genre

  await waitForHydration(genreLink)
  await genreLink.click()
  await expect(page).toHaveURL(isFilteredLibrary)
  await expect(page.getByTestId('filter-genre')).toHaveText(genreName)
  await expect(libraryPage.foundCount).toHaveText(/Найдено: [1-9]\d*/)
  // The title has this genre itself, so the filtered list must contain it
  const card = libraryPage.card(title)
  await expect(card).toBeVisible()

  // BackButton is router.back(): back to the filtered library the title was opened from
  await libraryPage.openCard(card)
  await mediaPage.waitForLoad()
  await expect(mediaPage.heading).toHaveText(title)
  await waitForHydration(mediaPage.backButton)
  await mediaPage.backButton.click()
  await expect(page).toHaveURL(isFilteredLibrary)
  await expect(page.getByTestId('filter-genre')).toHaveText(genreName)
  await expect(card).toBeVisible()
})

test('TC-MEDIA-013: unknown title id renders the 404 page inside the app shell', async ({ page, navbar }) => {
  await page.goto(`/media/${crypto.randomUUID()}`, { waitUntil: 'domcontentloaded' })

  // No app/not-found.tsx: notFound() renders Next's default 404 (see TC-PROFILE-003)
  await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'This page could not be found.' })).toBeVisible()
  await expect(page).toHaveTitle(/404/)
  await expect(page.getByTestId('status-select')).toHaveCount(0)
  // No error boundary (app/(app)/error.tsx), the navbar is still there
  await expect(page.getByText('Что-то пошло не так')).toHaveCount(0)
  await navbar.assertVisible()
})
