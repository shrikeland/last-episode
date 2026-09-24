import { type Page, expect } from '@playwright/test'

export class NavbarPage {
  constructor(private readonly page: Page) {}

  async logout() {
    await this.page.getByTestId('avatar-button').click()
    await this.page.getByTestId('navbar-signout-button').waitFor({ state: 'visible' })
    await this.page.getByTestId('navbar-signout-button').click()
    await this.page.waitForURL(/login/, { timeout: 10000 })
  }

  /**
   * Username of the signed-in user, read from the user menu's profile link.
   * The local and the CI test accounts are different users — never hardcode it.
   * Leaves the menu open.
   */
  async ownUsername(): Promise<string> {
    await this.page.getByTestId('avatar-button').click()
    const href = await this.profileLink.getAttribute('href')
    const username = href?.match(/^\/profile\/([^/]+)$/)?.[1]
    expect(username, `unexpected profile link href: ${href}`).toBeTruthy()
    return decodeURIComponent(username!)
  }

  get profileLink() {
    return this.page.getByTestId('menu-profile-link')
  }

  async assertVisible() {
    await expect(this.page.getByTestId('navbar')).toBeVisible()
  }
}
