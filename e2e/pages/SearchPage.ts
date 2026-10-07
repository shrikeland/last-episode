import { type Page, type Locator, expect } from '@playwright/test'
import { waitForHydration, waitForServerAction } from '@/support/actions'
import type { StatusLabel } from '@/pages/LibraryPage'
import type { TmdbKind } from '@/support/test-data'

export class SearchPage {
  constructor(private readonly page: Page) {}

  /** Opens /search and waits until the input is hydrated (a value typed earlier is lost). */
  async goto() {
    await this.page.goto('/search')
    await waitForHydration(this.searchInput)
  }

  /**
   * Types `query` and waits for the search server action (`searchTitles`, fired after a 400 ms
   * debounce) to answer — results or «Ничего не найдено» render right after it. The query must be
   * at least 2 characters and differ from the current one, otherwise no request is sent.
   */
  async search(query: string) {
    await waitForServerAction(this.page, () => this.searchInput.fill(query))
  }

  async waitForResults(timeout = 10000): Promise<Locator> {
    const firstCard = this.firstResultCard()
    await firstCard.waitFor({ state: 'visible', timeout })
    return firstCard
  }

  /** «Ничего не найдено по запросу «…»» — for the current query when `query` is given. */
  async waitForEmpty(timeout = 10000, query?: string) {
    const text = query ? `Ничего не найдено по запросу «${query}»` : /Ничего не найдено/
    await expect(this.page.getByText(text)).toBeVisible({ timeout })
  }

  async clearSearch() {
    await this.clearButton.click()
  }

  get searchInput() {
    return this.page.getByTestId('search-input')
  }

  get clearButton() {
    return this.page.getByRole('button', { name: 'Очистить поиск' })
  }

  /** Every TMDB result card on the page. */
  resultCards() {
    return this.page.locator('[data-testid^="tmdb-result-card-"]')
  }

  firstResultCard() {
    return this.resultCards().first()
  }

  /** The result card of an exact TMDB title (movie and tv ids are separate sequences). */
  resultCard(kind: TmdbKind, tmdbId: number) {
    return this.page.getByTestId(`tmdb-result-card-${kind}-${tmdbId}`)
  }

  /** Localized title of a result card — its first line. */
  resultTitle(card: Locator) {
    return card.locator('p').first()
  }

  addButton(card: Locator) {
    return card.getByRole('button', { name: 'Добавить' })
  }

  addedButton(card: Locator) {
    return card.getByRole('button', { name: 'Добавлено' })
  }

  // ── AddToLibraryDialog ───────────────────────────────────────────────────

  get dialog() {
    return this.page.getByRole('dialog')
  }

  /** «Статус» select inside the add dialog. */
  get dialogStatusSelect() {
    return this.dialog.getByRole('combobox', { name: 'Статус тайтла' })
  }

  /** Toast after a successful add: «<title>» добавлен в коллекцию. */
  addedToast(title: string) {
    return this.page.getByText(`«${title}» добавлен в коллекцию`)
  }

  async openAddDialog(card: Locator) {
    await this.addButton(card).click()
    await this.assertDialogOpen()
    return this.dialog
  }

  async chooseDialogStatus(status: StatusLabel) {
    await this.dialogStatusSelect.click()
    await this.page.getByRole('option', { name: status, exact: true }).click()
    await expect(this.dialogStatusSelect).toHaveText(status)
  }

  async clickAddOnFirstResult() {
    await this.addButton(this.firstResultCard()).click()
  }

  async assertDialogOpen() {
    await expect(this.dialog).toBeVisible({ timeout: 5000 })
  }

  /** «Сохранить» in the add dialog; waits for the `addMediaItem` server action. */
  async confirmAdd() {
    await waitForServerAction(this.page, () => this.dialog.getByRole('button', { name: 'Сохранить' }).click())
  }

  async cancelAdd() {
    await this.dialog.getByRole('button', { name: 'Отмена' }).click()
  }

  /** Adds the first result with the default status, unless it's already in the library. */
  async ensureFirstResultAdded() {
    const card = this.firstResultCard()
    await expect(this.addButton(card).or(this.addedButton(card))).toBeVisible()
    if (await this.addButton(card).isVisible()) {
      await this.openAddDialog(card)
      await this.confirmAdd()
    }
    await this.assertFirstCardAdded()
  }

  /**
   * Adds a specific TMDB title with the default status unless it's already in the library.
   * Matched by TMDB kind + id, not by position: /search/multi ranks results differently over time.
   * (movie and tv ids are separate sequences in TMDB, hence the kind.)
   */
  async ensureAdded(query: string, kind: TmdbKind, tmdbId: number) {
    await this.goto()
    await this.search(query)
    const card = this.resultCard(kind, tmdbId)
    await card.waitFor({ state: 'visible', timeout: 15000 })
    const addButton = this.addButton(card)
    const addedButton = this.addedButton(card)
    await expect(addButton.or(addedButton)).toBeVisible()
    if (await addButton.isVisible()) {
      await this.openAddDialog(card)
      await this.confirmAdd()
    }
    await expect(addedButton).toBeVisible({ timeout: 15000 })
  }

  async assertFirstCardAdded() {
    await expect(this.addedButton(this.firstResultCard())).toBeVisible({ timeout: 10000 })
  }

  async assertFirstCardAddable() {
    await expect(this.addButton(this.firstResultCard())).toBeEnabled({ timeout: 5000 })
  }
}
