import type { Page } from '@playwright/test'
import { test, expect } from '@/fixtures'
import type { MediaPage } from '@/pages/MediaPage'

/**
 * Тост «Все серии отмечены → Перевести в «Просмотрено»?» (ideas/005, plans/auto-complete-status.md).
 *
 * Каждый тест работает на свежей копии одноразового сериала области (throwawayTitle('media') —
 * «Дрянь», 2 сезона × 6; удаляется в teardown), поэтому восстанавливать нечего.
 * prepare() выставляет статус и отмечает все серии, кроме последней.
 */
const LAST_SEASON = 1

/**
 * Статус выставлен, все серии кроме последней отмечены, последняя снята, последний сезон раскрыт.
 * Порядок важен: сначала статус и перезагрузка — updateStatus перерисовывает страницу
 * (revalidatePath), и поздний рендер сбросил бы только что отмеченные серии (см. MediaPage.changeStatus);
 * «Просмотрено» к тому же само отмечает все серии. Перезагрузка в конце обнуляет offeredRef:
 * тост предлагается раз за визит.
 */
async function prepare(page: Page, mediaPage: MediaPage, mediaUrl: string, statusLabel: string) {
  await page.goto(mediaUrl)
  await mediaPage.waitForLoad()
  // The first visit creates the season and episode rows (SeasonsSection syncs them from TMDB);
  // «Просмотрено» marks the existing episodes, so let the sync finish before the status change
  await expect(mediaPage.seasonAccordion).toBeVisible()
  await mediaPage.setStatus(statusLabel)
  await page.reload()
  await mediaPage.waitForLoad()

  if ((await mediaPage.markAllTitleButton.textContent()) === 'Отметить всё') {
    await mediaPage.clickAndSave(mediaPage.markAllTitleButton)
    await expect(mediaPage.titleWatchedIndicator).toBeVisible()
  }
  await mediaPage.openSeason(LAST_SEASON)
  const last = mediaPage.seasonEpisodeCheckboxes(LAST_SEASON).last()
  await mediaPage.clickAndSave(last)
  await expect(last).not.toBeChecked()

  await page.reload()
  await mediaPage.waitForLoad()
  await expect(mediaPage.statusSelect).toHaveText(statusLabel)
  await expect(mediaPage.titleWatchedIndicator).toHaveCount(0)
  await mediaPage.openSeason(LAST_SEASON)
  await expect(mediaPage.seasonEpisodeCheckboxes(LAST_SEASON).last()).not.toBeChecked()
  await expect(mediaPage.seasonEpisodeCheckboxes(LAST_SEASON).first()).toBeChecked()
  return mediaPage.seasonEpisodeCheckboxes(LAST_SEASON).last()
}

test('TC-AUTO-001: last episode offers «Просмотрено»; «Да» switches status and keeps earlier dates', async ({
  page,
  mediaPage,
  throwawayTitle,
}) => {
  const { mediaUrl } = await throwawayTitle('media')
  const last = await prepare(page, mediaPage, mediaUrl, 'Смотрю')
  // Первая раскрытая строка — S2E1, отмечена в prepare(); в строке видна дата просмотра
  const firstRowBefore = await mediaPage.episodeRow(0).textContent()

  await mediaPage.clickAndSave(last)
  await expect(mediaPage.completeOfferToast).toBeVisible()

  await mediaPage.clickAndSave(mediaPage.completeOfferToast.getByRole('button', { name: 'Да' }))
  // Без перезагрузки: revalidatePath в updateStatus + синк StatusSelect с пропсом
  await expect(mediaPage.statusSelect).toHaveText('Просмотрено')

  await page.reload()
  await mediaPage.waitForLoad()
  await expect(mediaPage.statusSelect).toHaveText('Просмотрено')
  await expect(mediaPage.titleWatchedIndicator).toBeVisible()
  await mediaPage.openSeason(LAST_SEASON)
  // markAllEpisodesWatched больше не перезаписывает watched_at у уже отмеченных серий
  await expect(mediaPage.episodeRow(0)).toHaveText(firstRowBefore ?? '')
})

test('TC-AUTO-002: offer is shown once per visit', async ({ page, mediaPage, throwawayTitle }) => {
  const { mediaUrl } = await throwawayTitle('media')
  const last = await prepare(page, mediaPage, mediaUrl, 'Смотрю')

  await mediaPage.clickAndSave(last)
  await expect(mediaPage.completeOfferToast).toBeVisible()

  // Снять и снова отметить: условие «всё отмечено» выполнено второй раз, но тост уже был
  await mediaPage.clickAndSave(last)
  await expect(last).not.toBeChecked()
  await mediaPage.clickAndSettle(last)
  await expect(last).toBeChecked()
  await expect(mediaPage.completeOfferToast).toHaveCount(1)
})

test('TC-AUTO-003: no offer when title is already «Просмотрено»', async ({ page, mediaPage, throwawayTitle }) => {
  const { mediaUrl } = await throwawayTitle('media')
  const last = await prepare(page, mediaPage, mediaUrl, 'Просмотрено')

  await mediaPage.clickAndSettle(last)
  await expect(last).toBeChecked()
  await expect(mediaPage.titleWatchedIndicator).toBeVisible()
  await expect(mediaPage.completeOfferToast).toHaveCount(0)
})

test('TC-AUTO-004: «Отметить сезон» also offers «Просмотрено»', async ({ page, mediaPage, throwawayTitle }) => {
  const { mediaUrl } = await throwawayTitle('media')
  await prepare(page, mediaPage, mediaUrl, 'Смотрю')

  await mediaPage.clickAndSave(mediaPage.markSeasonButton(LAST_SEASON))
  await expect(mediaPage.completeOfferToast).toBeVisible()
})

test('TC-AUTO-005: «Отметить всё» also offers «Просмотрено»', async ({ page, mediaPage, throwawayTitle }) => {
  const { mediaUrl } = await throwawayTitle('media')
  await prepare(page, mediaPage, mediaUrl, 'Смотрю')

  await mediaPage.clickAndSave(mediaPage.markAllTitleButton)
  await expect(mediaPage.completeOfferToast).toBeVisible()
})
