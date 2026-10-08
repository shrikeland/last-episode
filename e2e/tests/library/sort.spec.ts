// Seeded: TC-LIB-SORT-003 needs the two seed movies, the others need any card
import { test, expect } from '@/fixtures'
import { waitForHydration, waitForServerAction } from '@/support/actions'

// Seed movies as the library cards show them (SEED_TITLES)
const SEED_MOVIES = ['Начало', 'Интерстеллар']

test('TC-LIB-SORT-001: default sort is "Недавно добавленные"', async ({ libraryPage }) => {
  await libraryPage.goto()
  await libraryPage.waitForCards()
  await expect(libraryPage.sortSelect).toContainText('Недавно добавленные')
})

test('TC-LIB-SORT-002: unknown sort param falls back to default instead of crashing', async ({ libraryPage }) => {
  await libraryPage.goto({ sort: 'foo', dir: 'sideways' })
  await libraryPage.waitForCards()
  await expect(libraryPage.sortSelect).toContainText('Недавно добавленные')
})

test('TC-LIB-SORT-003: changing a title\'s status moves it to the top of "Недавно обновлённые"', async ({ page, libraryPage, mediaPage }) => {
  // The type filter gives a flat list without sections — the order is read directly
  const sorted = { type: 'movie', sort: 'updated_at', dir: 'desc' }
  await libraryPage.goto(sorted)
  await expect(libraryPage.sortSelect).toContainText('Недавно обновлённые')
  for (const title of SEED_MOVIES) await expect(libraryPage.card(title)).toBeVisible()

  // Only a seed movie is touched (other areas' throwaway movies may be in this list too):
  // the one of the two that is lower now — the other one is above it, so it is not first
  const order = await libraryPage.cards().getByRole('heading').allTextContents()
  const target = SEED_MOVIES.reduce((a, b) => (order.indexOf(a) > order.indexOf(b) ? a : b))
  const firstHeading = libraryPage.firstCard().getByRole('heading')
  await expect(firstHeading).not.toHaveText(target)

  // Its status goes to a temporary one and back — only updated_at moves.
  // «Брошено» is never used as the temporary one: the stats delta test counts it.
  await libraryPage.openCard(libraryPage.card(target))
  await mediaPage.waitForLoad()
  await waitForHydration(mediaPage.statusSelect)
  const original = ((await mediaPage.statusSelect.textContent()) ?? '').trim()
  const temporary = original === 'Отложено' ? 'Смотрю' : 'Отложено'
  try {
    await waitForServerAction(page, () => mediaPage.changeStatus(temporary))
    await expect(mediaPage.statusSelect).toContainText(temporary)
  } finally {
    await waitForServerAction(page, () => mediaPage.changeStatus(original))
    await expect(mediaPage.statusSelect).toContainText(original)
  }

  await libraryPage.goto(sorted)
  await expect(firstHeading).toHaveText(target)
})
