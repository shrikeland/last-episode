import { type Page, expect } from '@playwright/test'
import { waitForHydration } from '@/support/actions'

/** AppDock items in the order components/AppDock.tsx renders them. */
export const DOCK_ITEMS = ['Библиотека', 'Найти', 'Статистика', 'Для тебя', 'Сообщество'] as const
export type DockItem = (typeof DOCK_ITEMS)[number]

/** Navbar (logo + account menu) and the bottom AppDock — both live in app/(app)/layout.tsx. */
export class NavbarPage {
  constructor(private readonly page: Page) {}

  /** Logo link in the navbar center (aria-label «На главную»). */
  get logo() {
    return this.page.getByRole('link', { name: 'На главную' })
  }

  get accountMenuButton() {
    return this.page.getByRole('button', { name: 'Меню аккаунта' })
  }

  /** «Профиль» in the open account menu. */
  get profileMenuLink() {
    return this.page.getByRole('link', { name: 'Профиль' })
  }

  /** The bottom dock (components/ui/Dock.tsx: role="toolbar" aria-label="Навигация"). */
  get dock() {
    return this.page.getByRole('toolbar', { name: 'Навигация' })
  }

  async logout() {
    await this.page.getByTestId('avatar-button').click()
    await this.page.getByTestId('navbar-signout-button').waitFor({ state: 'visible' })
    await this.page.getByTestId('navbar-signout-button').click()
    await this.page.waitForURL(/login/, { timeout: 10000 })
  }

  /** Opens the account menu; resolves once its «Профиль» link is visible. */
  async openAccountMenu() {
    await waitForHydration(this.accountMenuButton)
    await this.accountMenuButton.click()
    await expect(this.profileMenuLink).toBeVisible()
  }

  /**
   * Clicks an AppDock item by its label. A dock item has no accessible name of its own — the
   * icon is aria-hidden and the label is a tooltip that renders only on hover. So the item is
   * picked by position, hovered, and checked to be named `label` (the tooltip makes it its name)
   * before the click: a reordered dock fails here instead of opening the wrong page.
   */
  async clickDockItem(label: DockItem) {
    const item = this.dock.getByRole('button').nth(DOCK_ITEMS.indexOf(label))
    await waitForHydration(item)
    await item.hover()
    // Not getByRole('tooltip'): the previous item's tooltip may still be fading out
    await expect(item).toHaveAccessibleName(label)
    await item.click()
  }

  /** Username of the signed-in user, read from the profile link in the account menu. */
  async getOwnUsername(): Promise<string> {
    // Callers may come straight from goto(..., 'domcontentloaded'): a pre-hydration click is lost
    await waitForHydration(this.page.getByTestId('avatar-button'))
    await this.page.getByTestId('avatar-button').click()
    const link = this.page.getByTestId('menu-profile-link')
    await link.waitFor({ state: 'visible' })
    const href = await link.getAttribute('href')
    // Close the menu again — its header also shows @username
    await this.page.getByTestId('avatar-button').click()
    await link.waitFor({ state: 'detached' })
    const username = href?.match(/^\/profile\/([^/?#]+)$/)?.[1]
    if (!username) throw new Error(`Unexpected profile link href: ${href}`)
    return decodeURIComponent(username)
  }

  async assertVisible() {
    await expect(this.page.getByTestId('navbar')).toBeVisible()
  }
}
