import { type Page, type Locator, expect } from '@playwright/test'

export class SearchPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/search', { waitUntil: 'networkidle' })
  }

  async search(query: string) {
    const input = this.page.getByTestId('search-input')
    await input.fill(query)
    // Wait for debounce (400ms) + network
    await this.page.waitForTimeout(600)
  }

  async waitForResults(timeout = 10000): Promise<Locator> {
    const firstCard = this.page.locator('[data-testid^="tmdb-result-card-"]').first()
    await firstCard.waitFor({ state: 'visible', timeout })
    return firstCard
  }

  async waitForEmpty(timeout = 10000) {
    await expect(this.page.getByText(/Ничего не найдено/)).toBeVisible({ timeout })
  }

  async clearSearch() {
    await this.page.getByRole('button', { name: 'Очистить поиск' }).click()
  }

  get searchInput() {
    return this.page.getByTestId('search-input')
  }

  firstResultCard() {
    return this.page.locator('[data-testid^="tmdb-result-card-"]').first()
  }

  async clickAddOnFirstResult() {
    const card = this.firstResultCard()
    await card.getByRole('button', { name: 'Добавить' }).click()
  }

  async assertDialogOpen() {
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  }

  async confirmAdd() {
    await this.page.getByRole('button', { name: 'Сохранить' }).click()
  }

  async cancelAdd() {
    await this.page.getByRole('button', { name: 'Отмена' }).click()
  }

  /** Adds the first result with the default status, unless it's already in the library. */
  async ensureFirstResultAdded() {
    const addButton = this.firstResultCard().getByRole('button', { name: 'Добавить' })
    if (await addButton.isVisible()) {
      await addButton.click()
      await this.assertDialogOpen()
      await this.confirmAdd()
    }
    await this.assertFirstCardAdded()
  }

  /**
   * Adds a specific TMDB title with the default status unless it's already in the library.
   * Matched by TMDB kind + id, not by position: /search/multi ranks results differently over time.
   * (movie and tv ids are separate sequences in TMDB, hence the kind.)
   */
  async ensureAdded(query: string, kind: 'movie' | 'tv', tmdbId: number) {
    await this.goto()
    await this.search(query)
    const card = this.page.getByTestId(`tmdb-result-card-${kind}-${tmdbId}`)
    await card.waitFor({ state: 'visible', timeout: 15000 })
    const addButton = card.getByRole('button', { name: 'Добавить' })
    const addedButton = card.getByRole('button', { name: 'Добавлено' })
    await expect(addButton.or(addedButton)).toBeVisible()
    if (await addButton.isVisible()) {
      await addButton.click()
      await this.assertDialogOpen()
      await this.confirmAdd()
    }
    await expect(addedButton).toBeVisible({ timeout: 15000 })
  }

  async assertFirstCardAdded() {
    const card = this.firstResultCard()
    await expect(card.getByRole('button', { name: 'Добавлено' })).toBeVisible({ timeout: 10000 })
  }

  async assertFirstCardAddable() {
    const card = this.firstResultCard()
    await expect(card.getByRole('button', { name: 'Добавить' })).toBeEnabled({ timeout: 5000 })
  }
}
