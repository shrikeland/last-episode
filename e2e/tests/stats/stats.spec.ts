import { test, expect } from '@/fixtures'
import { waitForHydration, waitForServerAction } from '@/support/actions'

/**
 * /stats. Other runs share the account and move their own throwaway titles between statuses,
 * so only deltas on this area's own title are asserted, never absolute totals.
 * The status «Брошено» is reserved for this spec: no other area moves titles into it.
 */
const DROPPED = 'Брошено'

test('TC-STATS-001: stats page loads with time overview', { tag: '@smoke' }, async ({ page, statsPage }) => {
  await statsPage.goto()
  await expect(page.getByText(/Общее время просмотра/)).toBeVisible()
})

test('TC-STATS-003: status count follows a status change and a delete', async ({
  page,
  statsPage,
  mediaPage,
  libraryPage,
  throwawayTitle,
}) => {
  // Fresh row with the default status «Хочу посмотреть»
  const { mediaUrl, title } = await throwawayTitle('stats')

  await statsPage.goto()
  const before = await statsPage.readStatusCount(DROPPED)

  await test.step(`move «${title}» to «${DROPPED}» on its page`, async () => {
    await page.goto(mediaUrl, { waitUntil: 'domcontentloaded' })
    await waitForHydration(mediaPage.statusSelect)
    await mediaPage.statusSelect.click()
    await waitForServerAction(page, () => page.getByRole('option', { name: DROPPED }).click())
    await expect(mediaPage.statusSelect).toHaveText(DROPPED)
  })

  await statsPage.goto()
  await expect(statsPage.statusCount(DROPPED)).toHaveText(String(before + 1))

  await test.step(`the «${DROPPED}» row opens the library filtered to it, with «${title}» in it`, async () => {
    const link = statsPage.statusLink(DROPPED)
    await waitForHydration(link)
    await link.click()
    await expect(page).toHaveURL(/\/library\?status=dropped$/)
    await expect(page.getByTestId('filter-status')).toHaveText(DROPPED)
    await expect(libraryPage.cardsByTitle(title)).toBeVisible()
  })

  // Deleted here rather than in the fixture's teardown (then a no-op) to see the count go back
  await libraryPage.removeByTitle(title)
  await statsPage.goto()
  await expect(statsPage.statusCount(DROPPED)).toHaveText(String(before))
})

test('TC-STATS-004: status and genre rows open the library with that filter', async ({
  page,
  statsPage,
  libraryPage,
}) => {
  const foundCount = page.getByTestId('library-found-count')

  await test.step('status row', async () => {
    await statsPage.goto()
    const link = await statsPage.busiestStatusLink()
    const href = await link.getAttribute('href')
    const status = new URL(href!, page.url()).searchParams.get('status')
    expect(status, `status link href: ${href}`).toBeTruthy()

    await waitForHydration(link)
    await link.click()
    await expect(page).toHaveURL((url) => url.pathname === '/library' && url.searchParams.get('status') === status)
    await expect(foundCount).toHaveText(/Найдено: [1-9]\d*/)
    await expect(libraryPage.cards().first()).toBeVisible()
  })

  await test.step('genre row', async () => {
    await statsPage.goto()
    // The top genre — the row with the most titles
    const link = statsPage.genreLinks().first()
    const genreName = await statsPage.genreName(link).innerText()
    const href = await link.getAttribute('href')
    const genre = new URL(href!, page.url()).searchParams.get('genre')
    expect(genre, `genre link href: ${href}`).toBeTruthy()

    await waitForHydration(link)
    await link.click()
    await expect(page).toHaveURL((url) => url.pathname === '/library' && url.searchParams.get('genre') === genre)
    await expect(page.getByTestId('filter-genre')).toHaveText(genreName)
    await expect(foundCount).toHaveText(/Найдено: [1-9]\d*/)
    await expect(libraryPage.cards().first()).toBeVisible()
  })
})

test('TC-STATS-005: watch timeline renders with its summary or the empty state', async ({ statsPage }) => {
  await statsPage.goto()
  await expect(statsPage.timeline).toBeVisible()
  await expect(statsPage.timeline.getByRole('heading', { name: 'Лента просмотра' })).toBeVisible()

  // Which branch renders depends on the account: the CI account has no episodes marked in the
  // last 30 days unless an earlier spec left some (the seed adds movies and an unwatched show).
  // Either way the two parts must agree: a summary comes with entries, the empty state without.
  await expect(statsPage.timelineSummary.or(statsPage.timelineEmptyState)).toBeVisible()
  if (await statsPage.timelineSummary.isVisible()) {
    await expect(statsPage.timelineSummary).toHaveText(/^за \d+ дней: [1-9]\d* сери(я|и|й)/)
    await expect(statsPage.timelineEmptyState).toHaveCount(0)
    const firstEntry = statsPage.timelineEntries().first()
    await expect(firstEntry).toBeVisible()
    await expect(firstEntry).toHaveAttribute('href', /^\/media\/[0-9a-f-]{36}$/)
  } else {
    await expect(statsPage.timelineEntries()).toHaveCount(0)
  }
})
