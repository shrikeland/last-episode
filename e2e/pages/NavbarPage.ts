import { type Page, expect } from '@playwright/test'

export class NavbarPage {
  constructor(private readonly page: Page) {}

  async logout() {
    await this.page.getByTestId('avatar-button').click()
    await this.page.getByTestId('navbar-signout-button').waitFor({ state: 'visible' })
    await this.page.getByTestId('navbar-signout-button').click()
    await this.page.waitForURL(/login/, { timeout: 10000 })
  }

  /** Username of the signed-in user, read from the profile link in the account menu. */
  async getOwnUsername(): Promise<string> {
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
