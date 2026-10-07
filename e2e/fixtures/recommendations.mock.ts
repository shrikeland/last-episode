import type { Page, Request as PwRequest } from '@playwright/test'
import { THROWAWAY_TITLES } from '@/support/test-data'

/**
 * Mocks of the AI recommendation API for tests/recommendations/*. No test ever reaches Groq:
 * `mockRecommendationsApi(page)` sends every request to /api/recommendations/* through a route
 * handler that either answers it with a mock or aborts it (and records it as unhandled).
 *
 * Not registered in fixtures/index.ts — the spec imports it directly.
 */

/** Mirror of `RecommendationCardData` (types/recommendations.ts) — e2e can't import app types. */
export interface RecommendationCardData {
  title: string
  year: number | null
  type: string
  reason: string
  tmdbId: number | null
  posterUrl: string | null
  inLibrary?: boolean
}

// Stream protocol of POST /api/recommendations/generate (components/recommendations/RecommendationsPage.tsx)
const INTRO_DONE_MARKER = '\n__INTRO_DONE__\n'
const CARDS_MARKER = '\n__CARDS__:'

export const MOCK_INTRO =
  'Под твоё философское настроение подобрал фильмы и сериалы, которые медленно раскрываются и оставляют после себя вопросы.'

/** The card backed by the `recs` throwaway title: «Добавить» goes through the real server action. */
export const REAL_CARD: RecommendationCardData = {
  title: THROWAWAY_TITLES.recs.title,
  year: 1988,
  type: 'movie',
  reason: 'Медитативное кино без слов: визуальная поэма о столкновении традиции и прогресса.',
  tmdbId: THROWAWAY_TITLES.recs.tmdbId,
  posterUrl: null,
  inLibrary: false,
}

/**
 * Five cards in the shape the server streams. Every tmdbId was checked with a real search on /search
 * (`tmdb-result-card-<kind>-<id>`), so opening any card's detail dialog would load a real title.
 * Types cover every badge (movie / animation / tv / anime); posters are null to keep the test off
 * the image optimizer — the card renders its placeholder, as it does for titles without a poster.
 */
export const MOCK_CARDS: readonly RecommendationCardData[] = [
  REAL_CARD,
  {
    title: 'Сталкер',
    year: 1979,
    type: 'movie',
    reason: 'Путешествие в Зону как разговор о вере, желании и цене исполненной мечты.',
    tmdbId: 1398,
    posterUrl: null,
    inLibrary: false,
  },
  {
    title: 'Ходячий замок',
    year: 2004,
    type: 'animation',
    reason: 'Тёплая сказка Миядзаки о взрослении и войне, которую интересно пересматривать.',
    tmdbId: 4935,
    posterUrl: null,
    inLibrary: false,
  },
  {
    title: 'Тьма',
    year: 2017,
    type: 'tv',
    reason: 'Многослойная головоломка о времени и семьях маленького городка.',
    tmdbId: 70523,
    posterUrl: null,
    inLibrary: false,
  },
  {
    title: 'Мастер Муси',
    year: 2005,
    type: 'anime',
    reason: 'Неспешные истории о природе и людях, близкие по настроению к «Ковбою Бибопу».',
    tmdbId: 26867,
    posterUrl: null,
    inLibrary: false,
  },
]

/**
 * Taste profile returned by the mocked «Обновить профиль». Several paragraphs on purpose: the card
 * clamps the summary to 4 lines and shows the «Читать полностью» toggle only when text is cut off.
 */
export const MOCK_TASTE_PROFILE = [
  'Тебя тянет к неспешному авторскому кино и сериалам, где важнее атмосфера и идея, чем сюжетные повороты.',
  'Любимые жанры — научная фантастика и драма: масштабные концепции, время, память, выбор героя.',
  'Ты охотно досматриваешь длинные истории, если в них есть цельный мир, и редко бросаешь начатое.',
  'Анимацию воспринимаешь как полноценное кино: ценишь Миядзаки и японскую анимацию с философским подтекстом.',
  'Комедии и лёгкие ситкомы встречаются в библиотеке редко, а оценки выше у медленных и визуально сильных работ.',
  'Рекомендации стоит строить вокруг созерцательных фильмов, интеллектуальной фантастики и камерных сериалов.',
].join('\n\n')

export function generateStreamBody(intro: string, cards: readonly RecommendationCardData[]): string {
  return `${intro}${INTRO_DONE_MARKER}${CARDS_MARKER}${JSON.stringify(cards)}\n`
}

type GenerateMock =
  | {
      intro?: string
      cards?: readonly RecommendationCardData[]
      /**
       * Deliver the intro first and hold the cards until `releaseCards()` — the only way to see
       * the intro and the skeletons: route.fulfill() hands the body over in one chunk, and in one
       * chunk the page finds the cards marker first and jumps straight to the results.
       * Must be set before the page is loaded (it adds an init script).
       */
      holdCards?: boolean
    }
  | { status: number; body?: string }

type ProfileMock =
  | {
      summary?: string
      /** The response is sent only after this promise resolves — to look at the «updating» state. */
      until?: Promise<void>
    }
  | { status: number; message?: string }

export type RecommendationsApiEndpoint = 'generate' | 'profile'

export interface RecommendationsApiMock {
  /** Mocks POST /api/recommendations/generate for the rest of the test. */
  generate(mock?: GenerateMock): Promise<void>
  /** Mocks POST /api/recommendations/profile for the rest of the test. */
  profile(mock?: ProfileMock): Promise<void>
  /** Requests answered by a mock, in order. */
  readonly handled: ReadonlyArray<{ endpoint: RecommendationsApiEndpoint; request: PwRequest }>
  /** URLs under /api/recommendations/ that no mock answered — aborted, they never reached the server. */
  readonly unhandled: readonly string[]
  /** Every request to /api/recommendations/ the page made (page.on('request')), mocked or not. */
  readonly seen: readonly string[]
  /** Parsed JSON bodies of the generate requests the page sent. */
  generateRequests(): Array<{ questionnaire: Record<string, unknown> }>
}

const RELEASE_CARDS = '__e2eReleaseRecommendationCards'

/**
 * Installs the guard: from now on every request of `page` to /api/recommendations/* is either
 * answered by a mock registered with `generate()` / `profile()` or aborted. Nothing passes through
 * to the real API, so Groq is never called. Call before the first navigation of the test.
 */
export async function mockRecommendationsApi(page: Page): Promise<RecommendationsApiMock> {
  const handled: Array<{ endpoint: RecommendationsApiEndpoint; request: PwRequest }> = []
  const unhandled: string[] = []
  const seen: string[] = []

  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/recommendations/')) seen.push(request.url())
  })

  // Registered first, so it runs last: specific mocks registered later take precedence
  await page.route('**/api/recommendations/**', async (route) => {
    unhandled.push(route.request().url())
    await route.abort('blockedbyclient')
  })

  return {
    handled,
    unhandled,
    seen,

    async generate(mock = {}) {
      if (!('status' in mock) && mock.holdCards) await holdCardsUntilReleased(page)
      await page.route('**/api/recommendations/generate', async (route) => {
        handled.push({ endpoint: 'generate', request: route.request() })
        if ('status' in mock) {
          await route.fulfill({ status: mock.status, contentType: 'text/plain', body: mock.body ?? 'Internal Server Error' })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: 'text/plain; charset=utf-8',
          body: generateStreamBody(mock.intro ?? MOCK_INTRO, mock.cards ?? MOCK_CARDS),
        })
      })
    },

    async profile(mock = {}) {
      await page.route('**/api/recommendations/profile', async (route) => {
        handled.push({ endpoint: 'profile', request: route.request() })
        if ('status' in mock) {
          await route.fulfill({ status: mock.status, json: { error: 'server_error', message: mock.message } })
          return
        }
        await mock.until
        await route.fulfill({
          json: { summary: mock.summary ?? MOCK_TASTE_PROFILE, updated_at: new Date().toISOString() },
        })
      })
    },

    generateRequests() {
      return handled
        .filter((h) => h.endpoint === 'generate')
        .map((h) => h.request.postDataJSON() as { questionnaire: Record<string, unknown> })
    },
  }
}

/**
 * Lets the mocked generate response through up to the cards marker and holds the rest until
 * `releaseCards(page)`. It only paces the body that page.route() returned — the data still comes
 * from the route mock. Implemented as a fetch wrapper because route.fulfill() can't stream.
 */
async function holdCardsUntilReleased(page: Page) {
  await page.addInitScript(
    ({ cardsMarker, releaseKey }) => {
      const realFetch = window.fetch.bind(window)
      window.fetch = async (input, init) => {
        const response = await realFetch(input, init)
        const url = new URL(input instanceof Request ? input.url : String(input), location.href)
        if (url.pathname !== '/api/recommendations/generate' || !response.ok) return response

        const text = await response.text()
        const cut = text.indexOf(cardsMarker)
        const head = cut === -1 ? text : text.slice(0, cut)
        const tail = cut === -1 ? '' : text.slice(cut)
        const released = new Promise<void>((resolve) => {
          ;(window as unknown as Record<string, () => void>)[releaseKey] = resolve
        })
        const encoder = new TextEncoder()
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            controller.enqueue(encoder.encode(head))
            await released
            if (tail) controller.enqueue(encoder.encode(tail))
            controller.close()
          },
        })
        return new Response(body, { status: response.status, headers: response.headers })
      }
    },
    { cardsMarker: CARDS_MARKER, releaseKey: RELEASE_CARDS },
  )
}

/** Sends the held cards of a `generate({ holdCards: true })` mock to the page. */
export async function releaseCards(page: Page) {
  await page.evaluate((releaseKey) => {
    const release = (window as unknown as Record<string, (() => void) | undefined>)[releaseKey]
    if (!release) throw new Error('No held recommendation cards: was generate({ holdCards: true }) set before goto?')
    release()
  }, RELEASE_CARDS)
}
