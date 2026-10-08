import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path' // needed for dotenv path resolution
import { USER_STATE } from './support/auth-state'

dotenv.config({ path: path.resolve(__dirname, '.env') })

// In this cloud environment, browsers are pre-installed at /opt/pw-browsers
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && require('fs').existsSync('/opt/pw-browsers')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers'
}

const BASE_URL = process.env.BASE_URL || 'https://www.episode.watch'
const isCI = !!process.env.CI

/**
 * Projects (setup + dependencies pattern):
 *   setup  → tests/setup/auth.setup.ts — UI login of user and friend → .auth/user.json, .auth/friend.json
 *   seed   → tests/setup/seed.setup.ts — SEED_TITLES in the user's library (needs .auth/user.json)
 *   guest  → tests/guest/**            — no session at all
 *   user   → every other spec          — signed in as user; a plain `page` is already authenticated
 *   logout → tests/auth/logout.spec.ts — global signOut revokes every session of user, so it runs last
 *
 * `--grep` (e.g. @smoke) filters only the projects you run directly: setup/seed are pulled in
 * as dependencies of `user` and always run in full (Playwright 1.56 builds dependency suites
 * unfiltered — checked with `--list --grep @smoke`).
 */
export default defineConfig({
  testDir: './tests',
  // Fails fast on missing credentials or an unreachable BASE_URL — locally too
  globalSetup: './support/global-setup.ts',
  // One worker on purpose: every test shares the same prod account
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Stop well before the job's timeout-minutes (30) so the HTML report is still written and uploaded
  globalTimeout: isCI ? 25 * 60_000 : undefined,
  // A systemic failure (e.g. login broken) fails every test × 3 attempts — no point running all of them
  maxFailures: isCI ? 10 : undefined,

  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // The repo is public and CI uploads the report: traces carry session cookies, videos and screenshots
    // show the test account (its email in the login form), so they are recorded only locally.
    // The ARIA page snapshot (error-context.md) is suppressed in CI by fixtures/index.ts — it records
    // form values, the password included
    trace: isCI ? 'off' : 'retain-on-failure',
    video: isCI ? 'off' : 'retain-on-failure',
    screenshot: isCI ? 'off' : 'only-on-failure',
    headless: process.env.HEADLESS !== 'false',
    ignoreHTTPSErrors: true,
    // Vercel Protection Bypass — set VERCEL_BYPASS_SECRET in CI secrets
    extraHTTPHeaders: process.env.VERCEL_BYPASS_SECRET
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS_SECRET }
      : {},
  },

  projects: [
    {
      name: 'setup',
      testMatch: /setup\/auth\.setup\.ts$/,
    },
    {
      name: 'seed',
      testMatch: /setup\/seed\.setup\.ts$/,
      dependencies: ['setup'],
      use: { storageState: USER_STATE },
    },
    {
      name: 'guest',
      testMatch: /guest\/.*\.spec\.ts$/,
    },
    {
      name: 'user',
      testMatch: /.*\.spec\.ts$/,
      testIgnore: [/guest\//, /setup\//, /auth\/logout\.spec\.ts$/],
      dependencies: ['seed'],
      use: { storageState: USER_STATE },
    },
    {
      name: 'logout',
      testMatch: /auth\/logout\.spec\.ts$/,
      dependencies: ['user'],
      use: { storageState: USER_STATE },
    },
  ],
})
