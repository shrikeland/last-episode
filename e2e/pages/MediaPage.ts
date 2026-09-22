import { type Page, expect } from '@playwright/test'

export class MediaPage {
  constructor(private readonly page: Page) {}

  async waitForLoad(timeout = 15000) {
    await this.page.locator('h1').first().waitFor({ state: 'visible', timeout })
    await expect(this.page.getByTestId('status-select')).toBeVisible({ timeout })
  }

  async changeStatus(statusLabel: string) {
    await this.page.getByTestId('status-select').click()
    await this.page.getByRole('option', { name: statusLabel }).click()
    await this.page.waitForTimeout(500)
  }

  async openFirstSeasonAccordion() {
    // Только Radix-триггер сезона (у него aria-expanded): первая кнопка в season-accordion —
    // это «Отметить всё / Снять отметку» в шапке прогресса, клик по ней меняет данные
    const accordion = this.page.getByTestId('season-accordion')
    const trigger = accordion.locator('button[aria-expanded]').first()
    if ((await trigger.getAttribute('aria-expanded')) === 'true') return
    await trigger.click()
    await this.page.waitForTimeout(300)
  }

  async toggleFirstEpisode() {
    const checkbox = this.page.locator('[data-testid^="episode-checkbox-"]').first()
    await checkbox.click()
    return checkbox
  }

  async markFirstSeasonWatched() {
    const btn = this.page.locator('[data-testid^="mark-season-button-"]').first()
    await btn.click()
    await this.page.waitForTimeout(500)
  }

  async editNotes(text: string) {
    const editor = this.page.getByTestId('notes-editor')
    await editor.click()
    // Clear existing and type new content
    await editor.locator('textarea, [contenteditable]').first().fill(text)
    // Blur to trigger save
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(500)
  }

  get statusSelect() {
    return this.page.getByTestId('status-select')
  }

  get seasonAccordion() {
    return this.page.getByTestId('season-accordion')
  }
}
