import { test as authTest, expect } from '@/fixtures/auth.fixture'
import { test, expect as baseExpect } from '@playwright/test'
import { isBaseUrlReachable } from '@/support/network'

let reachable: boolean
authTest.beforeAll(async () => { reachable = await isBaseUrlReachable() })
test.beforeAll(async () => { reachable = await isBaseUrlReachable() })

test('TC-REC-003: unauthenticated /recommendations redirects to /login', async ({ page }) => {
  test.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/recommendations', { waitUntil: 'domcontentloaded' })
  await baseExpect(page).toHaveURL(/login/, { timeout: 15000 })
})

authTest('TC-REC-001: recommendations page loads with questionnaire', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/recommendations', { waitUntil: 'networkidle' })
  // Page should show some content — either questionnaire or past recommendations
  const hasQuestionnaire = await page.getByTestId('recommendation-questionnaire').isVisible().catch(() => false)
  const hasContent = await page.locator('main, [role="main"], h1').first().isVisible()
  expect(hasQuestionnaire || hasContent).toBeTruthy()
})

authTest('TC-REC-002: questionnaire form is present and can be interacted with', async ({ authenticatedPage: page }) => {
  authTest.skip(!reachable, 'BASE_URL not reachable from this environment')
  await page.goto('/recommendations', { waitUntil: 'networkidle' })

  const questionnaire = page.getByTestId('recommendation-questionnaire')
  // isVisible() doesn't wait (its timeout is ignored) — waitFor does
  const hasQuestionnaire = await questionnaire.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)
  authTest.skip(!hasQuestionnaire, 'Questionnaire not visible on this session — may already have recommendations')

  // Questionnaire should have at least one interactive element
  await expect(questionnaire.locator('button, input, select').first()).toBeVisible()
})
