import { type Page, type Locator, expect } from '@playwright/test'

export class LibraryPage {
  constructor(private readonly page: Page) {}

  async goto(search?: string) {
    const url = search ? `/library?search=${encodeURIComponent(search)}` : '/library'
    await this.page.goto(url, { waitUntil: 'networkidle' })
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

  async assertOnPage() {
    await expect(this.page).toHaveURL(/library/)
  }
}
