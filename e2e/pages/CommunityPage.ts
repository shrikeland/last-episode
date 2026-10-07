import { type Locator, type Page, expect } from '@playwright/test'
import { waitForHydration, waitForServerAction } from '@/support/actions'

/** Relation of the signed-in user to someone else, as the user's card on /community shows it. */
export type Relation = 'none' | 'pending' | 'friend'

/**
 * Accessible name of the card's only button (components/community/UserCard.tsx) per relation.
 * On hover the label changes to «Отменить» / «Удалить» (group-hover), hence `expectRelation`
 * moves the pointer away before checking.
 */
const RELATION_BUTTON: Record<Relation, string> = {
  none: 'Добавить',
  pending: 'Отправлено',
  friend: 'В друзьях',
}

/** `title` of the card's button per relation — stable on hover, used to read the state. */
const RELATION_TITLE: Record<Exclude<Relation, 'none'>, string> = {
  pending: 'Отменить заявку',
  friend: 'Удалить из друзей',
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * POM for /community (components/community/*). Friend actions are server actions fired without
 * `await` after an optimistic state update, so every mutating click here waits for the action's
 * response — a navigation started earlier would cancel the request.
 */
export class CommunityPage {
  constructor(private readonly page: Page) {}

  /** Opens /community; resolves once the page is hydrated (clicks before that are lost). */
  async goto() {
    await this.page.goto('/community')
    await expect(this.searchInput).toBeVisible({ timeout: 20_000 })
    await waitForHydration(this.searchInput)
  }

  get heading() {
    return this.page.getByRole('heading', { level: 1, name: 'Сообщество' })
  }

  get searchInput() {
    return this.page.getByPlaceholder('Найти пользователя по логину...')
  }

  // ── Sections ────────────────────────────────────────────────────────────
  // The sections have no landmarks or test ids: each is the wrapper of its caption.

  /** «Поиск»: the input plus «Новые пользователи» (empty query) or the search results. */
  get searchSection() {
    return this.page.getByText('Поиск', { exact: true }).locator('..')
  }

  /** «Мои друзья (N)» — FriendsList. */
  get friendsSection() {
    return this.page.getByText(/^Мои друзья/).locator('xpath=../..')
  }

  /** «Вы ещё никого не добавили в друзья» */
  get noFriendsText() {
    return this.page.getByText('Вы ещё никого не добавили в друзья')
  }

  // ── User cards ──────────────────────────────────────────────────────────

  /** UserCard of `username` inside `scope`: the card link reads «@name Библиотека открыта|скрыта». */
  private userCard(scope: Locator, username: string) {
    return scope
      .getByRole('link', { name: new RegExp(`^@${escapeRegExp(username)} Библиотека (открыта|скрыта)$`) })
      .locator('..')
  }

  /** Card of `username` in the search results (or «Новые пользователи» while the query is empty). */
  searchResult(username: string) {
    return this.userCard(this.searchSection, username)
  }

  /** Card of `username` in «Мои друзья». */
  friendCard(username: string) {
    return this.userCard(this.friendsSection, username)
  }

  /** The only button of the search result card: «Добавить» / «Отправлено» / «В друзьях». */
  relationButton(username: string) {
    return this.searchResult(username).getByRole('button')
  }

  /** Types `username` into the search and waits for its card among the results. */
  async searchUser(username: string) {
    // searchUsers() is a server action fired after a 400 ms debounce
    await waitForServerAction(this.page, () => this.searchInput.fill(username))
    await expect(this.searchResult(username)).toBeVisible()
  }

  /** Asserts the relation the search result card of `username` shows. Run `searchUser` first. */
  async expectRelation(username: string, relation: Relation) {
    // The new button renders under the pointer that clicked the old one — its hover label
    // («Отменить» / «Удалить») would replace the resting one
    await this.page.mouse.move(0, 0)
    await expect(this.relationButton(username)).toHaveAccessibleName(RELATION_BUTTON[relation])
  }

  private async clickAndSave(button: Locator) {
    await waitForHydration(button)
    await waitForServerAction(this.page, () => button.click())
  }

  /** «Добавить» on the search result card. */
  async sendRequest(username: string) {
    await this.clickAndSave(this.searchResult(username).getByRole('button', { name: RELATION_BUTTON.none }))
  }

  /** «Отправлено» (hover: «Отменить») on the search result card. */
  async cancelRequest(username: string) {
    await this.clickAndSave(this.searchResult(username).getByTitle(RELATION_TITLE.pending))
  }

  /** «В друзьях» (hover: «Удалить») on the friend's card in «Мои друзья». */
  async removeFriend(username: string) {
    await this.clickAndSave(this.friendCard(username).getByTitle(RELATION_TITLE.friend))
  }

  // ── Incoming requests (IncomingRequests.tsx) ────────────────────────────

  /** Row of an incoming request from `username`; its link reads «@name хочет добавить вас в друзья». */
  incomingRequest(username: string) {
    return this.page
      .getByRole('link', { name: `@${username} хочет добавить вас в друзья`, exact: true })
      .locator('..')
  }

  async acceptRequest(username: string) {
    await this.clickAndSave(this.incomingRequest(username).getByRole('button', { name: 'Принять' }))
  }

  async declineRequest(username: string) {
    await this.clickAndSave(this.incomingRequest(username).getByRole('button', { name: 'Отклонить' }))
  }

  /**
   * Brings the relation between the signed-in user and `username` to «no link at all», whatever it
   * is now: declines their incoming request, cancels the outgoing one, removes the friendship.
   * Both directions can exist at once (UNIQUE is on (user_id, friend_id)), so it re-reads the
   * state after every step until the card says «Добавить» and nothing is incoming.
   */
  async disconnect(username: string) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await this.goto()
      // The page is server-rendered: after goto() the incoming list is already final
      if ((await this.incomingRequest(username).count()) > 0) {
        await this.declineRequest(username)
        continue
      }
      await this.searchUser(username)
      const title = await this.relationButton(username).getAttribute('title')
      if (title === RELATION_TITLE.pending) {
        await this.cancelRequest(username)
      } else if (title === RELATION_TITLE.friend) {
        await this.clickAndSave(this.relationButton(username))
      } else {
        await this.expectRelation(username, 'none')
        return
      }
    }
    throw new Error(`Could not clear the friendship with @${username}`)
  }
}
