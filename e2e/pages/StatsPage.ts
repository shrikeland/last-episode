import { type Locator, type Page, expect } from '@playwright/test'

/**
 * POM for /stats (app/(app)/stats/page.tsx): StatsOverview, StatsBreakdown («По статусу»),
 * GenreTopList («Топ жанры»), WatchTimeline («Лента просмотра»).
 * The page is force-dynamic: every navigation renders fresh numbers, no cache to bust.
 */
export class StatsPage {
  constructor(private readonly page: Page) {}

  get heading() {
    return this.page.getByRole('heading', { level: 1, name: 'Статистика' })
  }

  /** Opens /stats; resolves once the server-rendered page is there. */
  async goto() {
    await this.page.goto('/stats', { waitUntil: 'domcontentloaded' })
    await expect(this.heading).toBeVisible()
  }

  // ─── StatsBreakdown: one link per status, `/library?status=<status>` ─────

  statusLinks() {
    return this.page.getByTestId('stats-status-link')
  }

  /** The row of a status by its label, e.g. «Брошено». */
  statusLink(label: string) {
    return this.statusLinks().filter({ has: this.page.getByText(label, { exact: true }) })
  }

  /** The count cell of a status row — the only cell that is a bare number (the share ends with «%»). */
  statusCount(label: string) {
    return this.statusLink(label).getByText(/^\d+$/)
  }

  async readStatusCount(label: string): Promise<number> {
    return toCount(await this.statusCount(label).innerText())
  }

  /**
   * The status row with the most titles. Other test runs move their own throwaway titles between
   * statuses, so the biggest row is the one least likely to drop to 0 before the click.
   */
  async busiestStatusLink(): Promise<Locator> {
    await expect(this.statusLinks()).toHaveCount(5)
    let busiest = { index: -1, count: 0 }
    for (let i = 0; i < 5; i++) {
      const count = toCount(await this.statusLinks().nth(i).getByText(/^\d+$/).innerText())
      if (count > busiest.count) busiest = { index: i, count }
    }
    if (busiest.index < 0) throw new Error('Every status row on /stats is 0 — the seeded library is missing')
    return this.statusLinks().nth(busiest.index)
  }

  // ─── GenreTopList: one link per genre, `/library?genre=<genre>`, biggest first ─

  genreLinks() {
    return this.page.getByTestId('stats-genre-link')
  }

  /** Genre name as the row shows it (capitalized) — the 2nd span: rank, name, count. */
  genreName(link: Locator) {
    return link.locator('span').nth(1)
  }

  // ─── WatchTimeline ───────────────────────────────────────────────────────

  get timeline() {
    return this.page.getByTestId('watch-timeline')
  }

  /** «за 30 дней: N серий, M ч» — rendered only when something was watched in the window. */
  get timelineSummary() {
    return this.page.getByTestId('watch-timeline-summary')
  }

  /** «За последние 30 дней отметок нет» — rendered instead of the day list. */
  get timelineEmptyState() {
    return this.timeline.getByText(/^За последние \d+ дней отметок нет$/)
  }

  /** One link per (title, day) entry, each opens `/media/<id>`. */
  timelineEntries() {
    return this.timeline.getByRole('link')
  }
}

function toCount(text: string): number {
  const count = Number(text.trim())
  if (!Number.isInteger(count)) throw new Error(`Not a count: «${text}»`)
  return count
}
