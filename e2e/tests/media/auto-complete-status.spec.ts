import { type Page } from '@playwright/test'
import { newAuthenticatedContext } from '@/fixtures/auth.fixture'
import { test, expect } from '@/fixtures/library.fixture'
import { LibraryPage } from '@/pages/LibraryPage'
import { MediaPage } from '@/pages/MediaPage'
import { isBaseUrlReachable } from '@/support/network'

/**
 * Тост «Все серии отмечены → Перевести в «Просмотрено»?» (ideas/005, plans/auto-complete-status.md).
 *
 * Работает на сериале «Чернобыль» (1 сезон, 5 серий) — его добавляет ensureLibrarySeeded.
 * prepare() сам выставляет нужный статус и отметки, исходное состояние не важно.
 * Тесты меняют его состояние, afterAll возвращает статус и отметки
 * (у последней серии обновится watched_at — это ожидаемо).
 */
const TITLE = 'Чернобыль'

let reachable: boolean
let mediaUrl: string | null = null

// prepare() reloads the title several times and clicks episodes one by one against prod — 30s is not enough
test.describe.configure({ mode: 'serial', timeout: 90_000 })

test.beforeAll(async () => {
  reachable = await isBaseUrlReachable()
})

async function findTitleUrl(page: Page): Promise<string | null> {
  if (mediaUrl) return mediaUrl
  const library = new LibraryPage(page)
  await library.goto()
  await library.filterByText(TITLE)
  await page.waitForURL(/search=/, { timeout: 5000 })
  const card = library.cards().filter({ hasText: TITLE }).first()
  // isVisible() doesn't wait (its timeout is ignored) — a slow render made the title look missing
  const found = await card.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)
  if (!found) return null
  await card.locator('a').first().click()
  await page.waitForURL(/\/media\//, { timeout: 15000 })
  mediaUrl = new URL(page.url()).pathname
  return mediaUrl
}

async function openTitle(page: Page): Promise<MediaPage> {
  await page.goto(mediaUrl!, { waitUntil: 'networkidle' })
  const media = new MediaPage(page)
  await media.waitForLoad()
  await media.openFirstSeasonAccordion()
  await media.episodeCheckboxes().first().waitFor({ state: 'visible', timeout: 5000 })
  return media
}

async function setStatus(page: Page, media: MediaPage, label: string) {
  if ((await media.statusSelect.textContent())?.includes(label)) return
  await media.statusSelect.click()
  await media.clickAndSave(page.getByRole('option', { name: label }))
}

/**
 * Статус выставлен, все серии кроме последней отмечены, последняя снята.
 * Страница перезагружается в конце: статус в SeasonAccordion приходит пропсом из серверного рендера,
 * а offeredRef должен начать визит с нуля.
 */
async function prepare(page: Page, statusLabel: string): Promise<MediaPage> {
  let media = await openTitle(page)
  await setStatus(page, media, statusLabel)
  media = await openTitle(page)

  const checkboxes = media.episodeCheckboxes()
  const count = await checkboxes.count()
  for (let i = 0; i < count - 1; i++) {
    if (!(await checkboxes.nth(i).isChecked())) await media.clickAndSave(checkboxes.nth(i))
  }
  if (await checkboxes.nth(count - 1).isChecked()) await media.clickAndSave(checkboxes.nth(count - 1))

  media = await openTitle(page)
  await expect(media.statusSelect).toContainText(statusLabel)
  await expect(media.episodeCheckboxes().last()).not.toBeChecked()
  return media
}

test.afterAll(async ({ browser }) => {
  if (!reachable || !mediaUrl) return
  // Hooks don't inherit describe.configure's timeout; restoring clicks every episode
  test.setTimeout(90_000)
  // Not the saved storageState as is: the session in it may have been revoked by TC-AUTH-010
  const context = await newAuthenticatedContext(browser)
  const page = await context.newPage()
  try {
    let media = await openTitle(page)
    await setStatus(page, media, 'Смотрю')
    media = await openTitle(page)
    const checkboxes = media.episodeCheckboxes()
    const count = await checkboxes.count()
    for (let i = 0; i < count; i++) {
      if (!(await checkboxes.nth(i).isChecked())) await media.clickAndSave(checkboxes.nth(i))
    }
  } finally {
    await context.close()
  }
})

test('TC-AUTO-001: last episode offers «Просмотрено»; «Да» switches status and keeps earlier dates', async ({ authenticatedPage: page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  // Seeded by library.fixture — a missing title is a failure, not a reason to skip
  expect(await findTitleUrl(page), `«${TITLE}» not found in test account library`).toBeTruthy()

  const media = await prepare(page, 'Смотрю')
  const firstRowBefore = await media.episodeRow(0).textContent()

  await media.clickAndSave(media.episodeCheckboxes().last())
  await expect(media.completeOfferToast).toBeVisible({ timeout: 5000 })

  await media.completeOfferToast.getByRole('button', { name: 'Да' }).click()
  // Без перезагрузки: router.refresh + синк StatusSelect с пропсом
  await expect(media.statusSelect).toContainText('Просмотрено', { timeout: 15000 })

  const reloaded = await openTitle(page)
  await expect(reloaded.statusSelect).toContainText('Просмотрено')
  // markAllEpisodesWatched больше не перезаписывает watched_at у уже отмеченных серий
  await expect(reloaded.episodeRow(0)).toHaveText(firstRowBefore ?? '')
})

test('TC-AUTO-002: offer is shown once per visit', async ({ authenticatedPage: page }) => {
  test.skip(!reachable || !mediaUrl, 'Title not available')

  const media = await prepare(page, 'Смотрю')
  const last = media.episodeCheckboxes().last()

  await media.clickAndSave(last)
  await expect(media.completeOfferToast).toBeVisible({ timeout: 5000 })

  await media.clickAndSave(last)
  await media.clickAndSave(last)
  await page.waitForTimeout(1500)
  await expect(media.completeOfferToast).toHaveCount(1)
})

test('TC-AUTO-003: no offer when title is already «Просмотрено»', async ({ authenticatedPage: page }) => {
  test.skip(!reachable || !mediaUrl, 'Title not available')

  const media = await prepare(page, 'Просмотрено')

  await media.clickAndSave(media.episodeCheckboxes().last())
  await page.waitForTimeout(1500)
  await expect(media.completeOfferToast).toHaveCount(0)
})

test('TC-AUTO-004: «Отметить сезон» also offers «Просмотрено»', async ({ authenticatedPage: page }) => {
  test.skip(!reachable || !mediaUrl, 'Title not available')

  const media = await prepare(page, 'Смотрю')

  await media.clickAndSave(page.locator('[data-testid^="mark-season-button-"]').first())
  await expect(media.completeOfferToast).toBeVisible({ timeout: 5000 })
})

test('TC-AUTO-005: «Отметить всё» also offers «Просмотрено»', async ({ authenticatedPage: page }) => {
  test.skip(!reachable || !mediaUrl, 'Title not available')

  const media = await prepare(page, 'Смотрю')

  await media.clickAndSave(media.markAllTitleButton)
  await expect(media.completeOfferToast).toBeVisible({ timeout: 5000 })
})
