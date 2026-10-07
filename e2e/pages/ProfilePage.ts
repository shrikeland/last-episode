import { type Locator, type Page, expect } from '@playwright/test'
import { waitForHydration, waitForServerAction } from '@/support/actions'
import type { StatusLabel } from '@/pages/LibraryPage'

/**
 * POM for another user's profile: /profile/[username] (library, «Что у нас общего») and the
 * read-only title page /profile/[username]/media/[id].
 */
export class ProfilePage {
  constructor(private readonly page: Page) {}

  async goto(username: string) {
    await this.page.goto(`/profile/${encodeURIComponent(username)}`)
    await expect(this.heading(username)).toBeVisible({ timeout: 20_000 })
  }

  heading(username: string) {
    return this.page.getByRole('heading', { level: 1, name: `@${username}`, exact: true })
  }

  // ── «Библиотека» (ProfileLibrarySections) ───────────────────────────────

  get librarySection() {
    return this.page.locator('section').filter({
      has: this.page.getByRole('heading', { level: 2, name: 'Библиотека', exact: true }),
    })
  }

  /** Poster link of a library card («Открыть <title>») → /profile/<name>/media/<id>. */
  libraryCard(title: string) {
    return this.librarySection.getByRole('link', { name: `Открыть ${title}`, exact: true })
  }

  // ── «Что у нас общего» (CommonTitles) — only on an accepted friend's profile ─

  get commonTitles() {
    return this.page.getByTestId('common-titles')
  }

  /** «Смотрели оба»: titles both have, neither in «Хочу посмотреть». */
  get commonWatched() {
    return this.page.getByTestId('common-watched')
  }

  /** «Любимое @name, которого нет у вас»: their rating ≥ 8 (or their top 10), missing from mine. */
  get commonFavorites() {
    return this.page.getByTestId('common-favorites')
  }

  /** Title link of a card in a «Что у нас общего» row. */
  commonCard(row: Locator, title: string) {
    return row.getByRole('link', { name: title, exact: true })
  }

  /** ProfileAddToLibraryControl of `title` inside `scope`, before it is added. */
  addButton(scope: Locator, title: string) {
    return scope.getByRole('button', { name: `Добавить «${title}»`, exact: true })
  }

  // ── AddToLibraryDialog opened from a profile ────────────────────────────

  get addDialog() {
    return this.page.getByRole('dialog', { name: 'Добавить в библиотеку' })
  }

  /**
   * Adds `title` to the signed-in user's library through the profile's «+» button in `scope`:
   * picks `status` in the dialog and saves. Waits for the `addMediaItem` server action.
   */
  async addFromProfile(scope: Locator, title: string, status: StatusLabel) {
    const button = this.addButton(scope, title)
    await waitForHydration(button)
    await button.click()
    await expect(this.addDialog).toBeVisible()
    await expect(this.addDialog.getByText(title).first()).toBeVisible()

    const statusSelect = this.addDialog.getByRole('combobox', { name: 'Статус тайтла' })
    await statusSelect.click()
    await this.page.getByRole('option', { name: status, exact: true }).click()
    await expect(statusSelect).toHaveText(status)

    await waitForServerAction(this.page, () => this.addDialog.getByRole('button', { name: 'Сохранить' }).click())
    await expect(this.addDialog).toBeHidden()
  }

  /** Toast after an add: «<title>» добавлен в коллекцию. */
  addedToast(title: string) {
    return this.page.getByText(`«${title}» добавлен в коллекцию`)
  }

  // ── /profile/[username]/media/[id] — read-only title page ───────────────

  /** «Библиотека @name» next to «К профилю». */
  ownerCaption(username: string) {
    return this.page.getByText(`Библиотека @${username}`, { exact: true })
  }

  get backToProfileLink() {
    return this.page.getByRole('link', { name: 'К профилю' })
  }

  /** «Моя карточка» — shown instead of «Добавить» when the title is in my library too. */
  get myCardLink() {
    return this.page.getByRole('link', { name: 'Моя карточка' })
  }

  /** Badge «Статус: <label>» */
  statusBadge(label: string) {
    return this.page.getByText(`Статус: ${label}`, { exact: true })
  }

  /** Badge «Оценка: 9/10» / «Оценка: Без оценки» */
  ratingBadge(text: string) {
    return this.page.getByText(`Оценка: ${text}`, { exact: true })
  }
}
