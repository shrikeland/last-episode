import { type Page, type Locator, expect } from '@playwright/test'
import { waitForHydration, waitForServerAction } from '@/support/actions'

/** Status label in the UI → `?status=` value (types/index.ts MEDIA_STATUS_LABELS). */
export const STATUS_PARAM = {
  'Все статусы': null,
  'Смотрю': 'watching',
  'Просмотрено': 'completed',
  'Хочу посмотреть': 'planned',
  'Брошено': 'dropped',
  'Отложено': 'on_hold',
} as const
export type StatusLabel = keyof typeof STATUS_PARAM

/** Type label in the filter → `?type=` value (MEDIA_TYPE_LABELS). */
export const TYPE_PARAM = {
  'Все типы': null,
  'Фильм': 'movie',
  'Мультфильм': 'animation',
  'Сериал': 'tv',
  'Аниме': 'anime',
} as const
export type TypeLabel = keyof typeof TYPE_PARAM

/** Short type label printed on a library card (MediaCard TYPE_LABELS_SHORT). */
export const CARD_TYPE_LABEL: Record<Exclude<TypeLabel, 'Все типы'>, string> = {
  'Фильм': 'Фильм',
  'Мультфильм': 'Мульт',
  'Сериал': 'Сериал',
  'Аниме': 'Аниме',
}

/** Rating filter label → `?rating=` value. */
export const RATING_PARAM = {
  'Любая оценка': null,
  '8 и выше': '8',
  '6 и выше': '6',
  'Без оценки': 'none',
} as const
export type RatingLabel = keyof typeof RATING_PARAM

export class LibraryPage {
  constructor(private readonly page: Page) {}

  /**
   * Opens /library. A string is the text filter; an object is passed as query params
   * (e.g. { type: 'tv' }). Resolves once the filter bar is interactive: it is rendered on the
   * client only (FilterBarNoSSR), so a filter used earlier would hit the skeleton.
   */
  async goto(params?: string | Record<string, string>) {
    const query = new URLSearchParams(typeof params === 'string' ? { search: params } : params).toString()
    await this.page.goto(query ? `/library?${query}` : '/library')
    // The skeleton stays until the FilterBar chunk arrives — on a slow prod response that alone
    // can outlast waitForHydration's 5 s poll, so wait for the real input first
    await expect(this.searchInput).toBeVisible({ timeout: 20_000 })
    await waitForHydration(this.searchInput)
  }

  // ── Cards ────────────────────────────────────────────────────────────────

  async waitForCards(timeout = 15000): Promise<Locator> {
    const first = this.cards().first()
    await first.waitFor({ state: 'visible', timeout })
    return first
  }

  /** Every library card: the type sections without filters, the flat grid with them. */
  cards() {
    return this.page.locator('[data-testid^="media-card-"]')
  }

  firstCard() {
    return this.cards().first()
  }

  /** Cards whose heading is exactly `title` (the library text filter alone also matches substrings). */
  cardsByTitle(title: string) {
    return this.cards().filter({ has: this.page.getByRole('heading', { name: title, exact: true }) })
  }

  /** The one card titled exactly `title`. */
  card(title: string) {
    return this.cardsByTitle(title).first()
  }

  /** Cards that do NOT show `label` as their status — `toHaveCount(0)` means «every card has it». */
  cardsWithoutStatus(label: StatusLabel) {
    return this.cards().filter({ hasNot: this.page.getByText(label, { exact: true }) })
  }

  /** Cards that do NOT show the short type badge of `type` («Сериал», «Фильм», …). */
  cardsWithoutType(type: Exclude<TypeLabel, 'Все типы'>) {
    return this.cards().filter({ hasNot: this.page.getByText(CARD_TYPE_LABEL[type], { exact: true }) })
  }

  /** Episode progress under a TV card, e.g. «1/7 эп.». */
  cardProgress(card: Locator) {
    return card.getByText(/^\d+\/\d+ эп\.$/)
  }

  async openCard(card: Locator) {
    await card.getByRole('link').first().click()
    await this.page.waitForURL(/\/media\/[^/?#]+$/)
  }

  async clickFirstCardLink() {
    await this.firstCard().getByRole('link').first().click()
  }

  private async openDeleteDialog(card: Locator) {
    const button = card.getByRole('button', { name: 'Удалить' })
    // The trash button is invisible until hover, and an unhydrated click never opens the dialog
    await waitForHydration(button)
    await card.hover()
    await button.click()
    const dialog = this.page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    return dialog
  }

  /** Deletes `card` through its confirmation dialog and waits for the delete server action. */
  async deleteCard(card: Locator) {
    const dialog = await this.openDeleteDialog(card)
    await waitForServerAction(this.page, () => dialog.getByRole('button', { name: 'Удалить' }).click())
  }

  /** Opens the delete dialog of `card` and presses «Отмена». */
  async cancelDelete(card: Locator) {
    const dialog = await this.openDeleteDialog(card)
    await dialog.getByRole('button', { name: 'Отмена' }).click()
    await expect(dialog).toBeHidden()
  }

  async deleteFirstCard() {
    await this.deleteCard(this.firstCard())
  }

  async cancelDeleteFirstCard() {
    await this.cancelDelete(this.firstCard())
  }

  // ── «Продолжить» (ContinueWatching) ─────────────────────────────────────

  get continueSection() {
    return this.page.getByTestId('continue-watching')
  }

  /** Card of the library row `mediaId` (the id in `/media/<id>`) in «Продолжить». */
  continueCard(mediaId: string) {
    return this.page.getByTestId(`continue-card-${mediaId}`)
  }

  /** «Просмотрено» button of a «Продолжить» card — its accessible name carries the next episode. */
  continueMarkButton(card: Locator) {
    return card.getByRole('button', { name: /^Отметить просмотренной:/ })
  }

  // ── Filters ──────────────────────────────────────────────────────────────

  get searchInput() {
    return this.page.getByPlaceholder('Поиск по названию...')
  }

  /** «Найдено: N · Сбросить» — rendered with every filtered result, empty or not. */
  get foundCount() {
    return this.page.getByTestId('library-found-count')
  }

  /** «Сбросить» link next to the counter. */
  get resetLink() {
    return this.foundCount.getByRole('link', { name: 'Сбросить' })
  }

  /** EmptyState of a filtered library: «Ничего не найдено» + «Сбросить фильтры». */
  get noResults() {
    return this.page.getByRole('heading', { name: 'Ничего не найдено' })
  }

  get resetFiltersButton() {
    return this.page.getByRole('link', { name: 'Сбросить фильтры' })
  }

  get sortSelect() {
    return this.page.getByTestId('library-sort')
  }

  /** Types into the title filter and waits until the debounced URL update has rendered. */
  async filterByText(query: string) {
    await this.searchInput.fill(query)
    await this.waitForParam('search', query || null)
  }

  async filterByStatus(status: StatusLabel) {
    await this.pickOption('filter-status', status)
    await this.waitForParam('status', STATUS_PARAM[status])
  }

  async filterByType(type: TypeLabel) {
    await this.pickOption('filter-type', type)
    await this.waitForParam('type', TYPE_PARAM[type])
  }

  /** `genre` as the dropdown shows it («Драма»); the URL keeps the lower-case canonical form. */
  async filterByGenre(genre: string) {
    await this.pickOption('filter-genre', genre)
    await this.waitForParam('genre', genre === 'Все жанры' ? null : genre.toLowerCase())
  }

  async filterByRating(rating: RatingLabel) {
    await this.pickOption('filter-rating', rating)
    await this.waitForParam('rating', RATING_PARAM[rating])
  }

  private async pickOption(selectTestId: string, option: string) {
    await this.page.getByTestId(selectTestId).click()
    await this.page.getByRole('option', { name: option, exact: true }).click()
  }

  /**
   * Waits for `?name=value` (null — the param is gone). FilterBar navigates with router.replace
   * inside a transition: the URL changes when the new server render is committed, so the cards
   * on the page match the URL once this resolves.
   */
  private async waitForParam(name: string, value: string | null) {
    await this.page.waitForURL((url) => url.pathname === '/library' && url.searchParams.get(name) === value)
  }

  // ── Throwaway helpers (used by the throwawayTitle fixture) ──────────────

  /** Opens /library filtered by `title`; resolves once the server-rendered result is on the page. */
  private async gotoFiltered(title: string) {
    await this.page.goto(`/library?${new URLSearchParams({ search: title })}`)
    // «Найдено: N» renders together with the cards (or the «Ничего не найдено» empty state)
    await expect(this.foundCount).toBeVisible()
  }

  /** `/media/<id>` of the library card titled exactly `title`. */
  async mediaUrlOf(title: string): Promise<string> {
    await this.gotoFiltered(title)
    const card = this.card(title)
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
      await this.deleteCard(cards.first())
      await expect(cards).toHaveCount(left - 1)
    }
  }

  async assertOnPage() {
    await expect(this.page).toHaveURL(/library/)
  }
}

/** `<id>` of a `/media/<id>` URL. */
export function mediaIdOf(mediaUrl: string): string {
  const id = mediaUrl.match(/\/media\/([^/?#]+)/)?.[1]
  if (!id) throw new Error(`Not a media URL: ${mediaUrl}`)
  return id
}
