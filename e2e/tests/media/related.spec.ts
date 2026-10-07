// «Рекомендации» on the title page (components/media/TitleRecommendations.tsx + RelatedTitleDialog).
// The list comes from TMDB for the area's throwaway show («Дрянь») and drifts over time, so the
// test picks a related title that is NOT in the library yet, adds it and deletes it again in
// `finally`. Seed titles and other areas' throwaway titles are never picked.
import { test, expect } from '@/fixtures'
import type { LibraryPage } from '@/pages/LibraryPage'
import type { MediaPage } from '@/pages/MediaPage'
import { THROWAWAY_TITLES } from '@/support/test-data'

/** Never added (and so never deleted) here: the seed titles (ru-RU names) and every area's throwaway. */
const PROTECTED = new Set<string>([
  'Начало',
  'Интерстеллар',
  'Чернобыль',
  'Матрица',
  'Паразиты',
  ...Object.values(THROWAWAY_TITLES).map((t) => t.title),
])

/**
 * A related title that can be added, has a description and whose name no library card carries
 * yet: cleanup deletes by name, so a namesake already in the library (another TMDB title called
 * the same) would go with it. Titles with spaces around the name («Юная ») are skipped — the
 * library search would not find them by the trimmed name. Leaves the page on /library.
 */
async function pickAddableRelated(mediaPage: MediaPage, libraryPage: LibraryPage) {
  const labels = await mediaPage
    .relatedDetailButtons()
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''))

  const candidates: string[] = []
  for (const label of labels) {
    const title = label.match(/^О чём «(.*)»$/)?.[1]
    if (!title || title !== title.trim() || PROTECTED.has(title)) continue

    // A title already in the library offers «Открыть в библиотеке» instead of «Добавить»
    const dialog = await mediaPage.openRelated(title)
    const addable = await dialog.getByRole('button', { name: 'Добавить' }).isVisible()
    const hasOverview = (await dialog.getByText('Описания пока нет.').count()) === 0
    await dialog.press('Escape')
    await expect(dialog).toBeHidden()
    if (addable && hasOverview) candidates.push(title)
    if (candidates.length === 3) break
  }

  for (const title of candidates) {
    await libraryPage.goto(title)
    await expect(libraryPage.foundCount).toBeVisible()
    if ((await libraryPage.cardsByTitle(title).count()) === 0) return title
  }
  throw new Error(`No related title of the throwaway show can be added: ${labels.join(', ')}`)
}

test('TC-MEDIA-012: related title — overview → «Добавить» → «В библиотеке» → opens its own page', async ({
  page,
  mediaPage,
  libraryPage,
  throwawayTitle,
}) => {
  const { mediaUrl } = await throwawayTitle('media')
  await page.goto(mediaUrl)
  await mediaPage.waitForLoad()
  await expect(mediaPage.relatedDetailButtons().first()).toBeVisible()

  let added: string | null = null
  try {
    const title = await pickAddableRelated(mediaPage, libraryPage)
    await page.goto(mediaUrl)
    await mediaPage.waitForLoad()
    const card = mediaPage.relatedCard(title)
    await expect(mediaPage.relatedCardButton(card)).toHaveText('Добавить')

    const dialog = await mediaPage.openRelated(title)
    await test.step('the overview shows the title and its description', async () => {
      await expect(dialog.getByRole('heading', { name: title })).toBeVisible()
      await expect(dialog).toHaveAccessibleDescription(/\S{10,}/)
    })

    await test.step('«Добавить» → add dialog with the default status → saved', async () => {
      await dialog.getByRole('button', { name: 'Добавить' }).click()
      await expect(dialog).toBeHidden()
      await expect(mediaPage.addDialog).toBeVisible()
      await expect(mediaPage.addDialog).toContainText(title)
      await expect(mediaPage.addDialog.getByRole('combobox', { name: 'Статус тайтла' })).toHaveText('Хочу посмотреть')
      // Registered before saving: a save that lands after a failed assertion is cleaned up too
      added = title
      await mediaPage.clickAndSave(mediaPage.addDialog.getByRole('button', { name: 'Сохранить' }))
      await expect(mediaPage.addDialog).toBeHidden()
      await expect(page.getByText(`«${title}» добавлен в коллекцию`)).toBeVisible()
      await expect(mediaPage.relatedCardButton(card)).toHaveText('В библиотеке')
      await expect(mediaPage.relatedCardButton(card)).toBeDisabled()
    })

    await test.step('after a reload the card still knows; the overview links to the new library row', async () => {
      await page.reload()
      await mediaPage.waitForLoad()
      await expect(mediaPage.relatedCardButton(card)).toHaveText('В библиотеке')

      const reopened = await mediaPage.openRelated(title)
      const openLink = reopened.getByRole('link', { name: 'Открыть в библиотеке' })
      await expect(openLink).toHaveAttribute('href', /^\/media\/[0-9a-f-]{36}$/)
      await openLink.click()
      await expect(page).toHaveURL((url) => /^\/media\/[0-9a-f-]{36}$/.test(url.pathname) && url.pathname !== mediaUrl)
      await mediaPage.waitForLoad()
      await expect(mediaPage.heading).toHaveText(title)
      await expect(mediaPage.statusSelect).toHaveText('Хочу посмотреть')
    })
  } finally {
    if (added) await libraryPage.removeByTitle(added)
  }
  // Really deleted: removeByTitle leaves /library?search=<title> open
  await expect(libraryPage.cardsByTitle(added!)).toHaveCount(0)
})
