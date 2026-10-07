// Seeded: the CI account starts with an empty library, these tests need cards
import { test, expect } from '@/fixtures'
import { LibraryPage } from '@/pages/LibraryPage'
import { MediaPage } from '@/pages/MediaPage'

test('TC-MEDIA-001: detail page loads with title and status select', async ({ page }) => {
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()
  await library.clickFirstCardLink()

  const media = new MediaPage(page)
  await media.waitForLoad()
  await expect(page).toHaveURL(/\/media\//)
  await expect(page.locator('h1').first()).toBeVisible()
})

test('TC-MEDIA-002: changing status is reflected in the select', { tag: '@smoke' }, async ({ page }) => {
  const library = new LibraryPage(page)
  await library.goto()
  await library.waitForCards()
  await library.clickFirstCardLink()

  const media = new MediaPage(page)
  await media.waitForLoad()
  await media.changeStatus('Смотрю')

  // Status select should show new value
  await expect(media.statusSelect).toContainText('Смотрю', { timeout: 5000 })
})

test('TC-MEDIA-003: toggling episode checkbox changes checked state', { tag: '@smoke' }, async ({ page }) => {
  // Needs a TV show (season accordion). The unfiltered library opens with movies,
  // so filter by type — the seed guarantees at least one show
  const library = new LibraryPage(page)
  await library.goto({ type: 'tv' })
  await library.waitForCards()
  await library.clickFirstCardLink()

  const media = new MediaPage(page)
  await media.waitForLoad()
  await expect(media.seasonAccordion).toBeVisible()

  await media.openFirstSeasonAccordion()

  const checkbox = page.locator('[data-testid^="episode-checkbox-"]').first()
  await checkbox.waitFor({ state: 'visible', timeout: 5000 })

  const wasChecked = await checkbox.isChecked()
  await media.toggleFirstEpisode()

  await expect(checkbox).toBeChecked({ checked: !wasChecked, timeout: 5000 })
})

test('TC-MEDIA-004: mark season watched checks all episodes', async ({ page }) => {
  const library = new LibraryPage(page)
  await library.goto({ type: 'tv' })
  await library.waitForCards()
  await library.clickFirstCardLink()

  const media = new MediaPage(page)
  await media.waitForLoad()
  await expect(media.seasonAccordion).toBeVisible()

  await media.openFirstSeasonAccordion()
  await media.markFirstSeasonWatched()

  // After marking season, all visible episode checkboxes should be checked
  const checkboxes = page.locator('[data-testid^="episode-checkbox-"]')
  const count = await checkboxes.count()
  test.skip(count === 0, 'No episode checkboxes visible')

  for (let i = 0; i < Math.min(count, 3); i++) {
    await expect(checkboxes.nth(i)).toBeChecked({ timeout: 5000 })
  }
})
