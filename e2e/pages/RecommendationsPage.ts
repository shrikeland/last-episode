import { type Locator, type Page, expect } from '@playwright/test'
import { waitForHydration } from '@/support/actions'

export interface QuestionnaireAnswers {
  /** Step 1, button label: «Фильм», «Мультфильм», «Сериал», «Аниме», «Неважно» */
  type: string
  /** Step 2, mood title, e.g. «Философ на смене» */
  mood: string
  /** Step 3, exclusion chips to switch on, e.g. «Без грустных концовок» */
  exclusions?: string[]
  /** Step 3, «Только новое» (default) / «Включая отложенные» / «Можно пересмотреть» */
  familiarity?: string
}

const NOT_ENOUGH_TITLES = 'Добавь хотя бы 5 тайтлов в библиотеку для персонализации'

/** Escapes a string for use inside a RegExp. */
function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * POM for /recommendations («Для тебя»). The page has three phases: questionnaire (with the taste
 * profile card above it) → streaming (intro, then skeletons) → results (cards + «Новая анкета»).
 * The questionnaire is locked (`pointer-events-none`) until the user has ≥5 library titles and a
 * taste profile; `unlockQuestionnaire()` gets a profile through the (mocked) «Обновить профиль».
 */
export class RecommendationsPage {
  constructor(private readonly page: Page) {}

  get heading() {
    return this.page.getByRole('heading', { name: 'Для тебя', level: 1 })
  }

  get tasteProfileCard() {
    return this.page.getByTestId('taste-profile-card')
  }

  get updateProfileButton() {
    return this.page.getByTestId('update-profile-button')
  }

  get tasteProfileSummary() {
    return this.page.getByTestId('taste-profile-summary')
  }

  get tasteProfileToggle() {
    return this.page.getByTestId('taste-profile-toggle')
  }

  get questionnaire() {
    return this.page.getByTestId('recommendation-questionnaire')
  }

  /** «Продолжить» on steps 1–2, «Получить рекомендации» on the last one. */
  get nextButton() {
    return this.questionnaire.getByRole('button', { name: /^(Продолжить|Получить рекомендации)$/ })
  }

  get results() {
    return this.page.getByTestId('recommendation-results')
  }

  get skeletons() {
    return this.page.getByTestId('recommendation-skeletons')
  }

  get cards() {
    return this.page.getByTestId('recommendation-card')
  }

  /** The result card titled exactly `title`. */
  card(title: string) {
    return this.cards.filter({ has: this.page.getByText(title, { exact: true }) })
  }

  get newQuestionnaireButton() {
    return this.page.getByTestId('new-questionnaire-button')
  }

  /** Questions of the Stepper steps, to tell which step is shown. */
  readonly stepQuestions = {
    type: 'Что хочешь посмотреть сегодня?',
    mood: 'Какой ты сегодня?',
    exclusions: 'Что не хочешь сегодня?',
  } as const

  stepQuestion(step: keyof RecommendationsPage['stepQuestions']) {
    return this.questionnaire.getByText(this.stepQuestions[step])
  }

  async goto() {
    await this.page.goto('/recommendations')
    await expect(this.heading).toBeVisible()
    await expect(this.tasteProfileCard).toBeVisible()
    // The page locks the profile and the questionnaire below 5 library titles, and no mock can lift
    // that: the count is rendered on the server. The seeded library must hold ≥5 titles
    await expect(
      this.tasteProfileCard.getByText(NOT_ENOUGH_TITLES),
      'precondition: the test account needs ≥5 library titles (SEED_TITLES in support/test-data.ts)',
    ).toBeHidden()
    await waitForHydration(this.updateProfileButton)
  }

  /** Clicks «Обновить профиль»; the profile API must be mocked. */
  async updateProfile() {
    await this.updateProfileButton.click()
  }

  async expectQuestionnaireUnlocked() {
    await expect(this.questionnaire).toBeVisible()
    await expect(this.questionnaire).not.toHaveClass(/pointer-events-none/)
  }

  /**
   * Makes the questionnaire usable whatever the account's real profile is (the CI account may have
   * none): a mocked «Обновить профиль» puts a profile into the page state. Nothing is saved on the server.
   */
  async unlockQuestionnaire() {
    await this.updateProfile()
    await expect(this.page.getByText('Профиль вкусов обновлён')).toBeVisible()
    await this.expectQuestionnaireUnlocked()
  }

  /**
   * Content type button of step 1, named «<emoji><label>». Anchored to a non-letter before the label:
   * a plain substring match of «Фильм» would also hit «Мультфильм».
   */
  typeOption(label: string) {
    return this.questionnaire.getByRole('button', { name: new RegExp(`(^|\\P{L})${escapeRegExp(label)}$`, 'u') })
  }

  /** Any other option button (mood, exclusion chip, familiarity) — its name starts with the label after an icon. */
  option(label: string) {
    return this.questionnaire.getByRole('button', { name: label })
  }

  /** Walks the Stepper through all three steps and clicks «Получить рекомендации». */
  async completeQuestionnaire(answers: QuestionnaireAnswers) {
    await expect(this.stepQuestion('type')).toBeVisible()
    await this.typeOption(answers.type).click()
    await this.nextButton.click()

    await expect(this.stepQuestion('mood')).toBeVisible()
    await this.option(answers.mood).click()
    await this.nextButton.click()

    await expect(this.stepQuestion('exclusions')).toBeVisible()
    for (const exclusion of answers.exclusions ?? []) await this.option(exclusion).click()
    if (answers.familiarity) await this.option(answers.familiarity).click()
    await this.questionnaire.getByRole('button', { name: 'Получить рекомендации' }).click()
  }

  /** Waits for the results phase with `count` cards. */
  async expectCards(count: number) {
    await expect(this.cards).toHaveCount(count)
    await expect(this.newQuestionnaireButton).toBeVisible()
  }

  /** Back in the questionnaire phase, on step 1 with nothing selected. */
  async expectFreshQuestionnaire() {
    await expect(this.tasteProfileCard).toBeVisible()
    await expect(this.stepQuestion('type')).toBeVisible()
    await expect(this.nextButton).toHaveText('Продолжить')
    await expect(this.nextButton).toBeDisabled()
    await expect(this.results).toBeHidden()
  }
}
