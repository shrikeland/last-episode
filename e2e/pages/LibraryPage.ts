import { type Page, type Locator, expect } from '@playwright/test'
import { waitForServerAction } from '@/support/actions'

export class LibraryPage {
  constructor(private readonly page: Page) {}

  /** A string is the text filter; an object is passed as query params (e.g. { type: 'tv' }). */
  async goto(params?: string | Record<string, string>) {
    const query = new URLSearchParams(typeof params === 'string' ? { search: params } : params).toString()
    await this.page.goto(query ? `/library?${query}` : '/library', { waitUntil: 'networkidle' })
  }

  async waitForCards(timeout = 15000): Promise<Locator> {
    const first = this.page.locator('[data-testid^="media-card-"]').first()
    await first.waitFor({ state: 'visible', timeout })
    return first
  }

  cards() {
    return this.page.locator('[data-testid^="media-card-"]')
  }

  firstCard() {
    return this.page.locator('[data-testid^="media-card-"]').first()
  }

  async filterByText(query: string) {
    await this.page.getByPlaceholder('Поиск по названию...').fill(query)
    await this.page.waitForTimeout(500)
  }

  async filterByStatus(status: string) {
    await this.page.getByTestId('filter-status').click()
    await this.page.getByRole('option', { name: status }).click()
    await this.page.waitForURL(/status=/, { timeout: 5000 })
  }

  async filterByType(type: string) {
    await this.page.getByTestId('filter-type').click()
    await this.page.getByRole('option', { name: type }).click()
    await this.page.waitForURL(/type=/, { timeout: 5000 })
  }

  async deleteFirstCard() {
    const card = this.firstCard()
    await card.hover()
    await card.getByRole('button', { name: 'Удалить' }).click()
    await this.page.getByRole('alertdialog').waitFor({ state: 'visible' })
    await this.page.getByRole('alertdialog').getByRole('button', { name: 'Удалить' }).click()
  }

  async cancelDeleteFirstCard() {
    const card = this.firstCard()
    await card.hover()
    await card.getByRole('button', { name: 'Удалить' }).click()
    await this.page.getByRole('alertdialog').waitFor({ state: 'visible' })
    await this.page.getByRole('alertdialog').getByRole('button', { name: 'Отмена' }).click()
  }

  async clickFirstCardLink() {
    const card = this.firstCard()
    const link = card.locator('a').first()
    await link.click()
  }

  /** Cards whose heading is exactly `title` (the library text filter alone also matches substrings). */
  cardsByTitle(title: string) {
    return this.cards().filter({ has: this.page.getByRole('heading', { name: title, exact: true }) })
  }

  /** Opens /library filtered by `title`; resolves once the server-rendered result is on the page. */
  private async gotoFiltered(title: string) {
    await this.page.goto(`/library?${new URLSearchParams({ search: title })}`)
    // «Найдено: N» renders together with the cards (or the «Ничего не найдено» empty state)
    await expect(this.page.getByTestId('library-found-count')).toBeVisible()
  }

  /** `/media/<id>` of the library card titled exactly `title`. */
  async mediaUrlOf(title: string): Promise<string> {
    await this.gotoFiltered(title)
    const card = this.cardsByTitle(title).first()
    await expect(card, `«${title}» is not in the library`).toBeVisible()
    const href = await card.getByRole('link').first().getAttribute('href')
    if (!href?.startsWith('/media/')) throw new Error(`Unexpected media card link: ${href}`)
    return href
  }

  /**
   * Deletes every card titled exactly `title` through the card's delete dialog.
   * Idempotent: a title that is not in the library is a no-op.
   */
  async removeByTitle(title: string) {
    await this.gotoFiltered(title)
    const cards = this.cardsByTitle(title)
    // More than one row only after an interrupted run — delete them all
    for (let left = await cards.count(); left > 0; left--) {
      const card = cards.first()
      await card.hover()
      await card.getByRole('button', { name: 'Удалить' }).click()
      const dialog = this.page.getByRole('alertdialog')
      await waitForServerAction(this.page, () => dialog.getByRole('button', { name: 'Удалить' }).click())
      await expect(cards).toHaveCount(left - 1)
    }
  }

  async assertOnPage() {
    await expect(this.page).toHaveURL(/library/)
  }
}
