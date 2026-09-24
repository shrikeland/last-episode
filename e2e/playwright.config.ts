import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path' // needed for dotenv path resolution

dotenv.config({ path: path.resolve(__dirname, '.env') })

// In this cloud environment, browsers are pre-installed at /opt/pw-browsers
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && require('fs').existsSync('/opt/pw-browsers')) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers'
}

const BASE_URL = process.env.BASE_URL || 'https://www.episode.watch'
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  // Fails fast in CI on missing credentials or unreachable BASE_URL
  globalSetup: './support/global-setup.ts',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: 2,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Stop well before the job's timeout-minutes (20) so the HTML report is still written and uploaded
  globalTimeout: isCI ? 15 * 60_000 : undefined,
  // A systemic failure (e.g. login broken) fails every test × 3 attempts — no point running all of them
  maxFailures: isCI ? 10 : undefined,

  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: process.env.HEADLESS !== 'false',
    ignoreHTTPSErrors: true,
    // Vercel Protection Bypass — set VERCEL_BYPASS_SECRET in CI secrets
    extraHTTPHeaders: process.env.VERCEL_BYPASS_SECRET
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS_SECRET }
      : {},
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // disabled by default — enable explicitly: --project=firefox
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // disabled by default — enable explicitly: --project=webkit
    },
  ],
})
