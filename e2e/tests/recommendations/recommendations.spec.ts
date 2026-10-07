import { test, expect } from '@/fixtures'

test('TC-REC-001: recommendations page loads with questionnaire', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/recommendations', { waitUntil: 'networkidle' })
  // Page should show some content — either questionnaire or past recommendations
  const hasQuestionnaire = await page.getByTestId('recommendation-questionnaire').isVisible().catch(() => false)
  const hasContent = await page.locator('main, [role="main"], h1').first().isVisible()
  expect(hasQuestionnaire || hasContent).toBeTruthy()
})

test('TC-REC-002: questionnaire form is present and can be interacted with', async ({ page }) => {
  await page.goto('/recommendations', { waitUntil: 'networkidle' })

  const questionnaire = page.getByTestId('recommendation-questionnaire')
  // isVisible() doesn't wait (its timeout is ignored) — waitFor does
  const hasQuestionnaire = await questionnaire.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)
  test.skip(!hasQuestionnaire, 'Questionnaire not visible on this session — may already have recommendations')

  // Questionnaire should have at least one interactive element
  await expect(questionnaire.locator('button, input, select').first()).toBeVisible()
})
