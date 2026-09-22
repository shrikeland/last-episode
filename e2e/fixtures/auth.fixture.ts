import { test as base, type Browser, type BrowserContext, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { isBaseUrlReachable } from '@/support/network'

const STORAGE_STATE_PATH = path.join(__dirname, '../support/auth.storage.json')

async function performLogin(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.getByTestId('login-email-input').fill(email)
  await page.getByTestId('login-password-input').fill(password)
  await page.getByTestId('login-submit-button').click()
  await page.waitForURL(/library/, { timeout: 20000 })
}

async function saveFreshSession(browser: Browser, email: string, password: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await performLogin(page, email, password)
  await context.storageState({ path: STORAGE_STATE_PATH })
  await context.close()
}

/**
 * The cached session goes stale when it is revoked server-side — e.g. TC-AUTH-010
 * logs out, and signOut() defaults to scope 'global', revoking every session of
 * the test user. The (app) layout then answers /library with a redirect to /login.
 */
async function isSessionValid(context: BrowserContext): Promise<boolean> {
  const res = await context.request.get('/library', { maxRedirects: 0 })
  return res.ok()
}

/**
 * authenticatedPage: a Page fixture that is pre-logged-in via stored session.
 * On first use it logs in via UI and saves storageState; subsequent uses load
 * the saved state and only log in again if the stored session was revoked.
 */
export const test = base.extend<{
  authenticatedPage: Page
}>({
  authenticatedPage: async ({ browser }, use) => {
    const reachable = await isBaseUrlReachable()
    if (!reachable) {
      // Skip gracefully: yield a plain page so Playwright doesn't error in fixture setup,
      // but tests using this fixture should also call test.skip(!reachable).
      const context = await browser.newContext()
      const page = await context.newPage()
      await use(page)
      await context.close()
      return
    }

    const email = process.env.TEST_USER_EMAIL!
    const password = process.env.TEST_USER_PASSWORD!

    if (!fs.existsSync(STORAGE_STATE_PATH)) {
      // First time: log in through UI and persist the session
      await saveFreshSession(browser, email, password)
    }

    let context = await browser.newContext({ storageState: STORAGE_STATE_PATH })
    if (!(await isSessionValid(context))) {
      await context.close()
      await saveFreshSession(browser, email, password)
      context = await browser.newContext({ storageState: STORAGE_STATE_PATH })
    }
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
