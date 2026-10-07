import type { Page } from '@playwright/test'

/**
 * POM for /profile/[username]. Intentionally empty for now: registered as a fixture in fixtures/index.ts,
 * so the part that covers this page fills in its own file without touching the fixture registry.
 */
export class ProfilePage {
  constructor(private readonly page: Page) {}
}
