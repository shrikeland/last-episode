import { test as setup, expect } from '@/fixtures'
import { FRIEND_STATE, USER_STATE } from '@/support/auth-state'

/**
 * Logs both test accounts in through the UI and saves their sessions for the other projects.
 * Runs on every `playwright test`, so a session revoked by the previous run's logout test
 * (TC-AUTH-010 signs out globally) never leaks into this one.
 */
const ACCOUNTS = [
  { name: 'user', email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD!, path: USER_STATE },
  { name: 'friend', email: process.env.TEST_USER2_EMAIL!, password: process.env.TEST_USER2_PASSWORD!, path: FRIEND_STATE },
]

for (const account of ACCOUNTS) {
  setup(`authenticate as ${account.name}`, async ({ page, loginPage, navbar }) => {
    await page.goto('/login')
    await loginPage.login(account.email, account.password)
    // A rejected login only shows a toast that is gone long before a timeout — fail with its text
    const errorToast = page.locator('[data-sonner-toast]')
    await expect(page.getByTestId('navbar').or(errorToast).first()).toBeVisible({ timeout: 20_000 })
    if (await errorToast.first().isVisible()) {
      throw new Error(`Login as ${account.name} was rejected: «${(await errorToast.first().innerText()).trim()}»`)
    }
    await expect(page).toHaveURL(/\/library/)
    await navbar.assertVisible()
    await page.context().storageState({ path: account.path })
  })
}
