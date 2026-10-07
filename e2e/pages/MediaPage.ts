import { type Page, type Locator, type Request, type Response, expect } from '@playwright/test'
import { waitForHydration } from '@/support/actions'

/** The request of a Next.js server action — same check as support/actions.ts waitForServerAction. */
function isServerAction(res: Response) {
  return res.request().method() === 'POST' && !!res.request().headers()['next-action']
}

/**
 * /media/<id> — the title page: status, rating, notes, genres, related titles and, for shows,
 * the season accordion (components/media/SeasonAccordion.tsx).
 *
 * Seasons are addressed by their 0-based position on the page, episodes by their number
 * (the checkbox is labelled «Эпизод <n>: <name>»). Radix unmounts the content of a closed
 * season, so open it (`openSeason`) before touching its episodes.
 */
export class MediaPage {
  constructor(private readonly page: Page) {}

  /** Title heading and status select are rendered and hydrated (the select opens on click). */
  async waitForLoad(timeout = 15000) {
    await expect(this.heading).toBeVisible({ timeout })
    await expect(this.statusSelect).toBeVisible({ timeout })
    await waitForHydration(this.statusSelect)
  }

  get heading() {
    return this.page.getByRole('heading', { level: 1 })
  }

  get backButton() {
    return this.page.getByTestId('back-button')
  }

  // ── Status ───────────────────────────────────────────────────────────────

  get statusSelect() {
    return this.page.getByTestId('status-select')
  }

  /**
   * Picks a status in the select. Does not wait for the save: use `setStatus` (or wrap it in
   * `waitForServerAction`) before navigating away.
   *
   * App bug: updateStatus calls revalidatePath, and Next 16 re-renders the CURRENT page from
   * that action. The re-render streams in after the action's response headers, and its fresh
   * `seasons` prop resets SeasonAccordion's episodeMap — an episode ticked in between is saved
   * but shows unchecked. Tick episodes BEFORE a status change, or reload the page after it.
   */
  async changeStatus(statusLabel: string) {
    await waitForHydration(this.statusSelect)
    await this.statusSelect.click()
    await this.page.getByRole('option', { name: statusLabel, exact: true }).click()
  }

  /** `changeStatus` + waits for the save and the select showing the new value. */
  async setStatus(statusLabel: string) {
    await this.saved(() => this.changeStatus(statusLabel))
    await expect(this.statusSelect).toHaveText(statusLabel)
  }

  // ── Rating / notes ───────────────────────────────────────────────────────

  get ratingInput() {
    return this.page.getByTestId('rating-input')
  }

  /** «7.5 / 10», or «—» without a rating. */
  get ratingValue() {
    return this.ratingInput.getByText(/^(—|\d+(\.5)? \/ 10)$/)
  }

  /**
   * Clicks the half-star of `value` (0.5 … 10) and waits for the save. Clicking the current
   * rating again clears it. The mouse is moved away afterwards: while it hovers a star the
   * label shows the hovered value, not the saved one.
   */
  async clickRating(value: number) {
    const star = this.ratingInput.getByRole('button', { name: `Оценка ${value}`, exact: true })
    await waitForHydration(star)
    await this.saved(() => star.click())
    await this.page.mouse.move(0, 0)
  }

  get notesEditor() {
    return this.page.getByTestId('notes-editor')
  }

  /** Replaces the notes and waits for the debounced (1.5 s) updateNotes save. */
  async saveNotes(text: string) {
    await waitForHydration(this.notesEditor)
    await this.saved(() => this.notesEditor.fill(text))
  }

  // ── Genres ───────────────────────────────────────────────────────────────

  /** Genre badges under the title, each a link to `/library?genre=<genre>`. */
  genreLinks() {
    return this.page.getByTestId('media-genre-link')
  }

  // ── Seasons and episodes ─────────────────────────────────────────────────

  get seasonAccordion() {
    return this.page.getByTestId('season-accordion')
  }

  /**
   * Radix trigger of a season: «Сезон 1 3/6 эп.». The other buttons of the accordion («Отметить
   * всё» in the progress header, «Отметить сезон» next to each trigger) change data, only the
   * trigger carries aria-expanded.
   */
  seasonTrigger(index: number) {
    return this.seasonAccordion.locator('button[aria-expanded]').nth(index)
  }

  /** A whole season: trigger, «Отметить сезон» and (when open) its episode rows. */
  seasonItem(index: number) {
    // season-accordion > Accordion root (data-orientation) > AccordionItem (data-state)
    return this.seasonAccordion.locator(':scope > [data-orientation] > [data-state]').nth(index)
  }

  /** «<watched>/<total> эп.» in the trigger of a season. */
  async expectSeasonProgress(index: number, watched: number, total: number) {
    await expect(this.seasonTrigger(index)).toContainText(`${watched}/${total} эп.`)
  }

  async openSeason(index: number) {
    const trigger = this.seasonTrigger(index)
    await waitForHydration(trigger)
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(this.seasonEpisodeCheckboxes(index).first()).toBeVisible()
  }

  async openFirstSeasonAccordion() {
    await this.openSeason(0)
  }

  /** Episode checkboxes of one (open) season, in episode order. */
  seasonEpisodeCheckboxes(index: number) {
    return this.seasonItem(index).getByRole('checkbox')
  }

  /** Checkbox of episode `episodeNumber` in season `seasonIndex` (open). */
  episode(seasonIndex: number, episodeNumber: number) {
    return this.seasonItem(seasonIndex).getByRole('checkbox', { name: new RegExp(`^Эпизод ${episodeNumber}:`) })
  }

  /** «Отметить сезон» / «Снять отметку» of a season. */
  markSeasonButton(index: number) {
    return this.seasonItem(index).locator('[data-testid^="mark-season-button-"]')
  }

  /** «Отметить по эту серию» — rendered only for an unwatched episode of an open season. */
  markUpToButton(seasonIndex: number, episodeNumber: number) {
    return this.seasonItem(seasonIndex).getByRole('button', {
      name: `Отметить по эпизод ${episodeNumber} включительно`,
      exact: true,
    })
  }

  /** Asked by «Отметить по эту серию» when an earlier season has unwatched episodes. */
  get markUpToDialog() {
    return this.page.getByTestId('mark-up-to-dialog')
  }

  get markUpToSeasonOnly() {
    return this.markUpToDialog.getByRole('button', { name: 'Только этот сезон' })
  }

  get markUpToAllPrevious() {
    return this.markUpToDialog.getByRole('button', { name: 'Все сезоны до этого' })
  }

  /** Every episode checkbox of every open season. */
  episodeCheckboxes() {
    return this.page.locator('[data-testid^="episode-checkbox-"]')
  }

  /** Строка серии целиком: в ней видна дата просмотра (watched_at). */
  episodeRow(index: number) {
    return this.episodeCheckboxes().nth(index).locator('xpath=..')
  }

  /** «Отметить всё» / «Снять отметку» in the progress header. */
  get markAllTitleButton() {
    return this.page.getByTestId('mark-all-title-button')
  }

  /** Green check next to «Прогресс» once every episode of the title is watched. */
  get titleWatchedIndicator() {
    return this.page.getByTestId('title-watched-indicator')
  }

  /** Тост «Все серии отмечены» из SeasonAccordion. */
  get completeOfferToast() {
    return this.page.locator('[data-sonner-toast]').filter({ hasText: 'Все серии отмечены' })
  }

  // ── Saving ───────────────────────────────────────────────────────────────

  /**
   * Runs `trigger` and waits until the server action it fires has really finished.
   *
   * Stricter than support/actions.ts `waitForServerAction`, which resolves on the response
   * HEADERS. Next sends them before the action has run: the first RSC row is
   * `{"a":"$@1",…}` — the result is a promise reference, filled in by a later row once the action
   * resolves (and, for updateStatus, followed by the re-rendered page). On a slow prod moment the
   * headers came at once and the body more than a minute later, so «headers arrived» ≠ «saved».
   *
   * The end of the body is awaited through the request events, not `response.finished()`: the
   * client sometimes aborts the body of updateStatus (net::ERR_ABORTED right after the headers),
   * and for an aborted body `finished()` never settles — the test hung until its timeout.
   * `requestfailed` is accepted as the end too; a lost save then shows up in the reload checks.
   */
  private async saved<T>(trigger: () => Promise<T>): Promise<T> {
    // Listening before the click: a body that ends together with the headers is not missed
    const ended = new Set<Request>()
    const onEnd = (req: Request) => void ended.add(req)
    this.page.on('requestfinished', onEnd)
    this.page.on('requestfailed', onEnd)
    try {
      const [response, result] = await Promise.all([
        this.page.waitForResponse(isServerAction, { timeout: 15_000 }),
        trigger(),
      ])
      const request = response.request()
      await expect
        .poll(() => ended.has(request), { message: 'server action response body never ended', timeout: 30_000 })
        .toBe(true)
      return result
    } finally {
      this.page.off('requestfinished', onEnd)
      this.page.off('requestfailed', onEnd)
    }
  }

  /** Клик, который дергает server action: ждём, пока он завершится, чтобы сохранение не оборвалось навигацией. */
  async clickAndSave(target: Locator) {
    await waitForHydration(target)
    await this.saved(() => target.click())
  }

  /**
   * `clickAndSave` plus two animation frames: the transition has resolved with the action's
   * result, and what the client shows in reaction (the «Все серии отмечены» toast) is painted.
   * For «nothing appears» checks — right after the response an absent toast proves nothing,
   * the code that would show it may not have run yet.
   */
  async clickAndSettle(target: Locator) {
    await this.clickAndSave(target)
    await this.page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    )
  }

  // ── Related titles (TitleRecommendations) ────────────────────────────────

  /** «Рекомендации» — related titles from TMDB (same franchise / similar). */
  get recommendations() {
    return this.page.getByRole('region', { name: 'Рекомендации' })
  }

  /** Poster buttons of the related titles, named «О чём «<title>»». */
  relatedDetailButtons() {
    return this.recommendations.getByRole('button', { name: /^О чём «/ })
  }

  /** Card of the related title `title`. */
  relatedCard(title: string) {
    // section > [heading row, scroll row > cards]
    return this.recommendations
      .locator(':scope > div:last-child > div')
      .filter({ has: this.page.getByRole('button', { name: `О чём «${title}»`, exact: true }) })
  }

  /** «Добавить» / «В библиотеке» at the bottom of a related card. */
  relatedCardButton(card: Locator) {
    return card.getByRole('button', { name: /^(Добавить|Добавляю\.\.\.|В библиотеке)$/ })
  }

  /** RelatedTitleDialog of `title` — its name is «<title> (<year>)». */
  relatedDialog(title: string) {
    return this.page.getByRole('dialog', { name: title })
  }

  /** Opens the overview dialog of a related title through its poster. */
  async openRelated(title: string) {
    const poster = this.recommendations.getByRole('button', { name: `О чём «${title}»`, exact: true })
    await waitForHydration(poster)
    await poster.click()
    const dialog = this.relatedDialog(title)
    await expect(dialog).toBeVisible()
    return dialog
  }

  /** AddToLibraryDialog opened from a related title («Добавить» in the overview). */
  get addDialog() {
    return this.page.getByRole('dialog', { name: 'Добавить в библиотеку' })
  }
}
