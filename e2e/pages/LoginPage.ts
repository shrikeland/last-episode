import { type Page, expect } from '@playwright/test'
import { fillSecret } from '@/support/actions'

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login', { waitUntil: 'networkidle' })
  }

  // fillSecret, not fill(): the CI report (public repo) would show «Fill "<value>"» steps with credentials
  async fillEmail(email: string) {
    await fillSecret(this.page.getByTestId('login-email-input'), email)
  }

  async fillPassword(password: string) {
    await fillSecret(this.page.getByTestId('login-password-input'), password)
  }

  async submit() {
    await this.page.getByTestId('login-submit-button').click()
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  async clickRegisterLink() {
    await this.page.getByTestId('login-register-link').click()
  }

  async assertOnPage() {
    await expect(this.page).toHaveURL(/login/)
    await expect(this.page.getByTestId('login-form')).toBeVisible()
  }
}
