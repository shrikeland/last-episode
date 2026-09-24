import { test as base, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { isBaseUrlReachable } from '@/support/network'

export const STORAGE_STATE_PATH = path.join(__dirname, '../support/auth.storage.json')

async function performLogin(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.getByTestId('login-email-input').fill(email)
  await page.getByTestId('login-password-input').fill(password)
  await page.getByTestId('login-submit-button').click()
  await page.waitForURL(/library/, { timeout: 20000 })
}

async function saveFreshSession(browser: Browser, options: BrowserContextOptions, email: string, password: string) {
  const context = await browser.newContext(options)
  const page = await context.newPage()
  await performLogin(page, email, password)
  await context.storageState({ path: STORAGE_STATE_PATH })
  await context.close()
}

/**
 * The cached session goes stale when it is revoked server-side — e.g. TC-AUTH-010
 * logs out, and signOut() defaults to scope 'global', revoking every session of
 * the test user. proxy.ts then answers /library with a redirect to /login.
 *
 * Checked with a page navigation, not context.request: on a timeout APIRequestContext
 * prints every request header into the error — the session cookie ended up in the
 * public CI log that way. 'commit' also doesn't wait for the streamed page body.
 */
async function isSessionValid(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage()
  try {
    await page.goto('/library', { waitUntil: 'commit' })
    return !new URL(page.url()).pathname.startsWith('/login')
  } finally {
    await page.close()
  }
}

/**
 * A browser context logged in as the test user. On first use it logs in via UI and
 * saves storageState; subsequent uses load the saved state and only log in again
 * if the stored session was revoked. The caller closes the context.
 *
 * `options` only matter outside a test (worker fixtures): there browser.newContext()
 * doesn't get the project's `use` (baseURL, extraHTTPHeaders), so they're passed in.
 */
export async function newAuthenticatedContext(
  browser: Browser,
  options: BrowserContextOptions = {},
): Promise<BrowserContext> {
  const email = process.env.TEST_USER_EMAIL!
  const password = process.env.TEST_USER_PASSWORD!

  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    // First time: log in through UI and persist the session
    await saveFreshSession(browser, options, email, password)
  }

  const context = await browser.newContext({ ...options, storageState: STORAGE_STATE_PATH })
  if (await isSessionValid(context)) return context

  await context.close()
  await saveFreshSession(browser, options, email, password)
  return browser.newContext({ ...options, storageState: STORAGE_STATE_PATH })
}

/**
 * authenticatedPage: a Page fixture that is pre-logged-in via stored session.
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

    const context = await newAuthenticatedContext(browser)
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
