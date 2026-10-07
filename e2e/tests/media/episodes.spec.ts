// Episode tracker of the title page (components/media/SeasonAccordion.tsx). Each test runs on a
// fresh copy of the area's throwaway show (throwawayTitle('media') — «Дрянь», 2 seasons × 6,
// nothing watched; deleted in teardown), so no test depends on what another one left behind.
// Every change is checked again after a reload: the checkboxes are optimistic client state.
//
// No status changes here: updateStatus re-renders the page (revalidatePath), and that late render
// resets the episode checkboxes to the server data it was rendered from (see MediaPage.changeStatus).
import { test, expect } from '@/fixtures'
import type { MediaPage } from '@/pages/MediaPage'
import type { Page } from '@playwright/test'

const EPISODES = 6 // per season of «Дрянь»

async function open(page: Page, mediaPage: MediaPage, mediaUrl: string) {
  await page.goto(mediaUrl)
  await mediaPage.waitForLoad()
  await expect(mediaPage.seasonAccordion).toBeVisible()
}

async function reload(page: Page, mediaPage: MediaPage) {
  await page.reload()
  await mediaPage.waitForLoad()
  await expect(mediaPage.seasonAccordion).toBeVisible()
}

/** Checked state of every episode of an open season, e.g. [true, true, false, …]. */
async function expectWatched(mediaPage: MediaPage, seasonIndex: number, watched: (episode: number) => boolean) {
  const checkboxes = mediaPage.seasonEpisodeCheckboxes(seasonIndex)
  await expect(checkboxes).toHaveCount(EPISODES)
  for (let n = 1; n <= EPISODES; n++) {
    await expect(mediaPage.episode(seasonIndex, n), `season ${seasonIndex + 1}, episode ${n}`).toBeChecked({
      checked: watched(n),
    })
  }
}

test('TC-MEDIA-003: toggling an episode checkbox checks it', { tag: '@smoke' }, async ({
  page,
  mediaPage,
  throwawayTitle,
}) => {
  const { mediaUrl } = await throwawayTitle('media')
  await open(page, mediaPage, mediaUrl)
  await mediaPage.openSeason(0)

  const first = mediaPage.episode(0, 1)
  await expect(first).not.toBeChecked()
  await mediaPage.clickAndSave(first)
  await expect(first).toBeChecked()
  await mediaPage.expectSeasonProgress(0, 1, EPISODES)
})

test('TC-MEDIA-004: «Отметить сезон» checks every episode of that season only', async ({
  page,
  mediaPage,
  throwawayTitle,
}) => {
  const { mediaUrl } = await throwawayTitle('media')
  await open(page, mediaPage, mediaUrl)
  await mediaPage.openSeason(0)

  await expect(mediaPage.markSeasonButton(0)).toHaveText('Отметить сезон')
  await mediaPage.clickAndSave(mediaPage.markSeasonButton(0))
  await expectWatched(mediaPage, 0, () => true)
  await expect(mediaPage.markSeasonButton(0)).toHaveText('Снять отметку')

  await reload(page, mediaPage)
  await mediaPage.expectSeasonProgress(0, EPISODES, EPISODES)
  await mediaPage.expectSeasonProgress(1, 0, EPISODES)
  await mediaPage.openSeason(0)
  await expectWatched(mediaPage, 0, () => true)
  await mediaPage.openSeason(1)
  await expectWatched(mediaPage, 1, () => false)
})

test('TC-MEDIA-007: ticking and unticking episodes survives a reload', async ({ page, mediaPage, throwawayTitle }) => {
  const { mediaUrl } = await throwawayTitle('media')
  await open(page, mediaPage, mediaUrl)
  await mediaPage.openSeason(0)

  await mediaPage.clickAndSave(mediaPage.episode(0, 1))
  await mediaPage.clickAndSave(mediaPage.episode(0, 3))
  await expect(mediaPage.episode(0, 3)).toBeChecked()

  await reload(page, mediaPage)
  await mediaPage.expectSeasonProgress(0, 2, EPISODES)
  await mediaPage.openSeason(0)
  await expectWatched(mediaPage, 0, (n) => n === 1 || n === 3)

  await mediaPage.clickAndSave(mediaPage.episode(0, 1))
  await expect(mediaPage.episode(0, 1)).not.toBeChecked()

  await reload(page, mediaPage)
  await mediaPage.expectSeasonProgress(0, 1, EPISODES)
  await mediaPage.openSeason(0)
  await expectWatched(mediaPage, 0, (n) => n === 3)
})

test('TC-MEDIA-009: «Отметить по эту серию» — no question in season 1, «только этот сезон» / «все до этого» in season 2', async ({
  page,
  mediaPage,
  throwawayTitle,
}) => {
  const { mediaUrl } = await throwawayTitle('media')
  await open(page, mediaPage, mediaUrl)

  await test.step('season 1, up to E2: no earlier seasons → marked without a dialog', async () => {
    await mediaPage.openSeason(0)
    await mediaPage.clickAndSave(mediaPage.markUpToButton(0, 2))
    await expect(mediaPage.markUpToDialog).toBeHidden()
    await expectWatched(mediaPage, 0, (n) => n <= 2)
  })

  await test.step('season 2, up to E3, «Только этот сезон»: season 1 stays as it was', async () => {
    await mediaPage.openSeason(1)
    await mediaPage.markUpToButton(1, 3).click()
    await expect(mediaPage.markUpToDialog).toBeVisible()
    await expect(mediaPage.markUpToDialog).toContainText('Будут отмечены серии 1–3 сезона 2')
    await mediaPage.clickAndSave(mediaPage.markUpToSeasonOnly)
    await expect(mediaPage.markUpToDialog).toBeHidden()
    await expectWatched(mediaPage, 1, (n) => n <= 3)
    await expectWatched(mediaPage, 0, (n) => n <= 2)

    await reload(page, mediaPage)
    await mediaPage.expectSeasonProgress(0, 2, EPISODES)
    await mediaPage.expectSeasonProgress(1, 3, EPISODES)
    await mediaPage.openSeason(0)
    await mediaPage.openSeason(1)
    await expectWatched(mediaPage, 0, (n) => n <= 2)
    await expectWatched(mediaPage, 1, (n) => n <= 3)
  })

  await test.step('season 2, up to E5, «Все сезоны до этого»: season 1 is filled up too', async () => {
    await mediaPage.markUpToButton(1, 5).click()
    await expect(mediaPage.markUpToDialog).toBeVisible()
    await mediaPage.clickAndSave(mediaPage.markUpToAllPrevious)
    await expect(mediaPage.markUpToDialog).toBeHidden()
    await expectWatched(mediaPage, 0, () => true)
    await expectWatched(mediaPage, 1, (n) => n <= 5)

    await reload(page, mediaPage)
    await mediaPage.expectSeasonProgress(0, EPISODES, EPISODES)
    await mediaPage.expectSeasonProgress(1, 5, EPISODES)
    await mediaPage.openSeason(0)
    await mediaPage.openSeason(1)
    await expectWatched(mediaPage, 0, () => true)
    await expectWatched(mediaPage, 1, (n) => n <= 5)
  })
})

test('TC-MEDIA-010: «Отметить всё» marks the whole title and shows «Тайтл просмотрен»; «Снять отметку» undoes it', async ({
  page,
  mediaPage,
  throwawayTitle,
}) => {
  const { mediaUrl } = await throwawayTitle('media')
  await open(page, mediaPage, mediaUrl)
  await expect(mediaPage.titleWatchedIndicator).toHaveCount(0)
  await expect(mediaPage.markAllTitleButton).toHaveText('Отметить всё')

  await mediaPage.clickAndSave(mediaPage.markAllTitleButton)
  await expect(mediaPage.titleWatchedIndicator).toBeVisible()
  await expect(mediaPage.markAllTitleButton).toHaveText('Снять отметку')

  await reload(page, mediaPage)
  await expect(mediaPage.titleWatchedIndicator).toBeVisible()
  await mediaPage.expectSeasonProgress(0, EPISODES, EPISODES)
  await mediaPage.expectSeasonProgress(1, EPISODES, EPISODES)
  await mediaPage.openSeason(1)
  await expectWatched(mediaPage, 1, () => true)

  await mediaPage.clickAndSave(mediaPage.markAllTitleButton)
  await expect(mediaPage.titleWatchedIndicator).toHaveCount(0)

  await reload(page, mediaPage)
  await expect(mediaPage.titleWatchedIndicator).toHaveCount(0)
  await expect(mediaPage.markAllTitleButton).toHaveText('Отметить всё')
  await mediaPage.expectSeasonProgress(0, 0, EPISODES)
  await mediaPage.expectSeasonProgress(1, 0, EPISODES)
})
