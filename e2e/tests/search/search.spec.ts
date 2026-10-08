// TMDB search. Adding a title end to end (former TC-SEARCH-005+007) lives in
// tests/library/lifecycle.spec.ts (TC-LIB-004) on the area's throwaway title.
import { test, expect } from '@/fixtures'

// Breaking Bad is never added by any test — its result card always offers «Добавить»
const BREAKING_BAD = { query: 'Breaking Bad', kind: 'tv', tmdbId: 1396 } as const
// El Camino shows up in the same results — a second, different card for the dialog test
const EL_CAMINO = { kind: 'movie', tmdbId: 559969 } as const
// Seed title (SEED_TITLES) — always in the library
const CHERNOBYL = { query: 'Chernobyl', kind: 'tv', tmdbId: 87108 } as const

test('TC-SEARCH-001: search returns results for valid query', { tag: '@smoke' }, async ({ searchPage }) => {
  await searchPage.goto()
  await searchPage.search(BREAKING_BAD.query)
  await expect(searchPage.resultCard(BREAKING_BAD.kind, BREAKING_BAD.tmdbId)).toBeVisible()
})

test('TC-SEARCH-002: search with no results shows empty message', async ({ searchPage }) => {
  await searchPage.goto()
  await searchPage.search('xyzzy12345notfound')
  await searchPage.waitForEmpty(10000, 'xyzzy12345notfound')
  await expect(searchPage.resultCards()).toHaveCount(0)
})

test('TC-SEARCH-003: clear button resets query and results', async ({ searchPage }) => {
  await searchPage.goto()
  await searchPage.search(BREAKING_BAD.query)
  await searchPage.waitForResults()

  await searchPage.clearSearch()

  await expect(searchPage.searchInput).toHaveValue('')
  await expect(searchPage.resultCards()).toHaveCount(0)
  await expect(searchPage.clearButton).toBeHidden()
})

test('TC-SEARCH-004: clicking Add opens AddToLibrary dialog', { tag: '@smoke' }, async ({ searchPage }) => {
  await searchPage.goto()
  await searchPage.search(BREAKING_BAD.query)
  const dialog = await searchPage.openAddDialog(searchPage.resultCard(BREAKING_BAD.kind, BREAKING_BAD.tmdbId))
  await expect(dialog).toContainText('Добавить в библиотеку')
})

test('TC-SEARCH-006: cancelling dialog does not add title', async ({ page, searchPage }) => {
  await searchPage.goto()
  await searchPage.search(BREAKING_BAD.query)
  const card = searchPage.resultCard(BREAKING_BAD.kind, BREAKING_BAD.tmdbId)
  const dialog = await searchPage.openAddDialog(card)
  await searchPage.cancelAdd()

  await expect(dialog).toBeHidden()
  await expect(searchPage.addButton(card)).toBeEnabled()
  // Nothing was saved: a fresh search still offers «Добавить»
  await page.reload()
  await expect(searchPage.addButton(card)).toBeEnabled()
})

test('TC-SEARCH-009: a new query replaces the previous results', async ({ page, searchPage }) => {
  await searchPage.goto()
  await searchPage.search(BREAKING_BAD.query)
  const breakingBad = searchPage.resultCard(BREAKING_BAD.kind, BREAKING_BAD.tmdbId)
  await expect(breakingBad).toBeVisible()

  await searchPage.search(CHERNOBYL.query)
  const chernobyl = searchPage.resultCard(CHERNOBYL.kind, CHERNOBYL.tmdbId)
  await expect(chernobyl).toBeVisible()
  await expect(breakingBad).toHaveCount(0)
  await expect(page).toHaveURL(/\?q=Chernobyl$/)
  // The seed title is in the library — the new results carry that too
  await expect(searchPage.addedButton(chernobyl)).toBeDisabled()
})

test('TC-SEARCH-010: the add dialog shows the title of the card it was opened from', async ({ searchPage }) => {
  await searchPage.goto()
  await searchPage.search(BREAKING_BAD.query)

  // Not the first card on purpose: the dialog must follow the clicked card
  const card = searchPage.resultCard(EL_CAMINO.kind, EL_CAMINO.tmdbId)
  const title = (await searchPage.resultTitle(card).textContent())?.trim() ?? ''
  expect(title).not.toBe('')
  await expect(searchPage.firstResultCard()).not.toContainText(title)

  const dialog = await searchPage.openAddDialog(card)
  await expect(dialog.getByText(title, { exact: true }).first()).toBeVisible()
  await expect(dialog).not.toContainText('Сериал')
  await searchPage.cancelAdd()
  await expect(dialog).toBeHidden()
})
