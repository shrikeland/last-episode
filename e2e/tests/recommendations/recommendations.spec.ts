import { test as base, expect } from '@/fixtures'
import {
  MOCK_CARDS,
  MOCK_INTRO,
  MOCK_TASTE_PROFILE,
  REAL_CARD,
  mockRecommendationsApi,
  releaseCards,
  type RecommendationsApiMock,
} from '@/fixtures/recommendations.mock'
import { waitForServerAction } from '@/support/actions'
import { THROWAWAY_TITLES } from '@/support/test-data'
import type { QuestionnaireAnswers } from '@/pages/RecommendationsPage'

/**
 * AI recommendations with a mocked API: Groq is never called. `recsApi` is an auto fixture — before
 * the test touches the page it routes every request to /api/recommendations/* into a mock or an
 * abort, and after the test it checks that each such request was answered by a mock.
 *
 * Precondition: the account has ≥5 library titles (the page locks itself below that). The taste
 * profile may be missing — each test gets one through the mocked «Обновить профиль».
 */
const test = base.extend<{ recsApi: RecommendationsApiMock }>({
  recsApi: [
    async ({ page }, use) => {
      const api = await mockRecommendationsApi(page)
      await use(api)
      expect(api.unhandled, 'requests to /api/recommendations/* that no mock answered').toEqual([])
      expect(api.seen, 'every request to /api/recommendations/* went to a mock').toEqual(
        api.handled.map((h) => h.request.url()),
      )
    },
    { auto: true },
  ],
})

const ANSWERS: QuestionnaireAnswers = {
  type: 'Фильм',
  mood: 'Философ на смене',
  exclusions: ['Без грустных концовок'],
  familiarity: 'Можно пересмотреть',
}

test(
  'TC-REC-004: questionnaire → intro → skeletons → 5 cards',
  { tag: '@smoke' },
  async ({ page, recsApi, recommendationsPage: recs }) => {
    await recsApi.profile()
    await recsApi.generate({ holdCards: true })
    await recs.goto()
    await recs.unlockQuestionnaire()

    // Stepper: «Продолжить» stays disabled until the step has an answer
    await expect(recs.stepQuestion('type')).toBeVisible()
    await expect(recs.nextButton).toBeDisabled()
    await recs.typeOption(ANSWERS.type).click()
    await expect(recs.nextButton).toBeEnabled()
    await recs.nextButton.click()

    await expect(recs.stepQuestion('mood')).toBeVisible()
    await expect(recs.nextButton).toBeDisabled()
    await recs.option(ANSWERS.mood).click()
    await recs.nextButton.click()

    await expect(recs.stepQuestion('exclusions')).toBeVisible()
    await recs.option(ANSWERS.exclusions![0]).click()
    await recs.option(ANSWERS.familiarity!).click()
    await recs.nextButton.click()

    // Intro is in, the cards are held back by the mock: skeletons in place of the cards
    await expect(recs.results.getByText(MOCK_INTRO)).toBeVisible()
    await expect(recs.skeletons).toBeVisible()
    await expect(recs.cards).toHaveCount(0)
    await expect(recs.tasteProfileCard).toBeHidden()

    await releaseCards(page)
    await recs.expectCards(MOCK_CARDS.length)
    await expect(recs.skeletons).toBeHidden()
    await expect(recs.results.getByText(MOCK_INTRO)).toBeVisible()
    for (const card of MOCK_CARDS) {
      await expect(recs.card(card.title)).toBeVisible()
    }
    // Type badges come from `type`
    await expect(recs.card('Мастер Муси').getByText('Аниме', { exact: true })).toBeVisible()
    await expect(recs.card('Ходячий замок').getByText('Мультфильм', { exact: true })).toBeVisible()

    // The answers reached the API in the shape the route reads
    expect(recsApi.generateRequests()).toEqual([
      {
        questionnaire: {
          contentType: 'movie',
          mood: expect.stringContaining(ANSWERS.mood),
          exclusions: ANSWERS.exclusions,
          familiarity: 'include_rewatch',
        },
      },
    ])
  },
)

test('TC-REC-005: recommended card → detail dialog → «Добавить» → title in the library', async ({
  page,
  recsApi,
  recommendationsPage: recs,
  libraryPage,
}) => {
  test.setTimeout(90_000)
  const { title } = THROWAWAY_TITLES.recs
  // A leftover row would turn «Добавить» into «В библиотеке» (the server reports already_exists)
  await libraryPage.removeByTitle(title)
  try {
    await recsApi.profile()
    await recsApi.generate()
    await recs.goto()
    await recs.unlockQuestionnaire()
    await recs.completeQuestionnaire(ANSWERS)
    await recs.expectCards(MOCK_CARDS.length)

    // The detail dialog loads the real title from TMDB (server action getRecommendationDetails)
    const card = recs.card(title)
    await card.getByText(title, { exact: true }).click()
    const details = page.getByRole('dialog')
    await expect(details.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 })
    await expect(details.getByText('Почему тебе подойдёт')).toBeVisible()
    await expect(details.getByText(REAL_CARD.reason)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(details).toBeHidden()

    // «Добавить» on the card → the add dialog → the real server action addRecommendedTitle
    await card.getByRole('button', { name: 'Добавить' }).click()
    const addDialog = page.getByRole('dialog', { name: 'Добавить в библиотеку' })
    await expect(addDialog.getByText(title).first()).toBeVisible()
    await waitForServerAction(page, () => addDialog.getByRole('button', { name: 'Сохранить' }).click(), 30_000)
    await expect(page.getByText('Добавлено в список')).toBeVisible()
    await expect(addDialog).toBeHidden()
    await expect(card.getByRole('button', { name: 'В библиотеке' })).toBeDisabled()

    // mediaUrlOf fails unless the library shows a card titled exactly `title`
    expect(await libraryPage.mediaUrlOf(title)).toMatch(/^\/media\//)
  } finally {
    await libraryPage.removeByTitle(title)
  }
})

test('TC-REC-006: generation error → toast, back to the questionnaire', async ({
  page,
  recsApi,
  recommendationsPage: recs,
}) => {
  await recsApi.profile()
  await recsApi.generate({ status: 500 })
  await recs.goto()
  await recs.unlockQuestionnaire()
  await recs.completeQuestionnaire(ANSWERS)

  await expect(page.getByText('Не удалось получить рекомендации')).toBeVisible()
  await recs.expectFreshQuestionnaire()
  await recs.expectQuestionnaireUnlocked()
  expect(recsApi.generateRequests()).toHaveLength(1)
})

test('TC-REC-007: «Новая анкета» resets the results to the questionnaire', async ({
  recsApi,
  recommendationsPage: recs,
}) => {
  await recsApi.profile()
  await recsApi.generate()
  await recs.goto()
  await recs.unlockQuestionnaire()
  await recs.completeQuestionnaire(ANSWERS)
  await recs.expectCards(MOCK_CARDS.length)

  await recs.newQuestionnaireButton.click()
  await recs.expectFreshQuestionnaire()
  await expect(recs.cards).toHaveCount(0)
  await recs.expectQuestionnaireUnlocked()
})

test('TC-REC-008: «Обновить профиль» → toast, the summary expands and collapses', async ({
  page,
  recsApi,
  recommendationsPage: recs,
}) => {
  let respond!: () => void
  await recsApi.profile({ until: new Promise<void>((resolve) => (respond = resolve)) })
  await recs.goto()

  await recs.updateProfile()
  // While the profile is being generated the button and the questionnaire are locked
  await expect(recs.updateProfileButton).toHaveText('Анализирую...')
  await expect(recs.updateProfileButton).toBeDisabled()
  await expect(recs.questionnaire).toHaveClass(/pointer-events-none/)
  respond()

  await expect(page.getByText('Профиль вкусов обновлён')).toBeVisible()
  await expect(recs.updateProfileButton).toHaveText('Обновить профиль')
  const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  await expect(recs.tasteProfileCard.getByText(`Обновлён ${today}`)).toBeVisible()
  await recs.expectQuestionnaireUnlocked()

  // The new summary is clamped to 4 lines with a «Читать полностью» toggle
  const firstParagraph = MOCK_TASTE_PROFILE.split('\n\n')[0]
  await expect(recs.tasteProfileSummary).toContainText(firstParagraph)
  await expect(recs.tasteProfileSummary).toHaveClass(/line-clamp-4/)
  await expect(recs.tasteProfileToggle).toHaveText('Читать полностью')
  await expect(recs.tasteProfileToggle).toHaveAttribute('aria-expanded', 'false')

  await recs.tasteProfileToggle.click()
  await expect(recs.tasteProfileToggle).toHaveText('Свернуть')
  await expect(recs.tasteProfileToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(recs.tasteProfileSummary).not.toHaveClass(/line-clamp-4/)

  await recs.tasteProfileToggle.click()
  await expect(recs.tasteProfileToggle).toHaveText('Читать полностью')
  await expect(recs.tasteProfileSummary).toHaveClass(/line-clamp-4/)
})
