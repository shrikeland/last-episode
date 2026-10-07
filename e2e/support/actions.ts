import { expect, type Locator, type Page, type Request } from '@playwright/test'

/**
 * Runs `trigger` and waits until the Next.js server action it fires (a POST carrying the
 * `next-action` header) has really finished. Use instead of a fixed sleep after clicks that save
 * data — the click returns right away, and a navigation started before the action ended may
 * cancel the save. Resolves with whatever `trigger` returns.
 *
 * The response HEADERS are not enough: Next sends them before the action has run — the first RSC
 * row is `{"a":"$@1",…}`, a promise reference filled in by a later row once the action resolves
 * (for actions with revalidatePath it is followed by the re-rendered page). On a slow prod moment
 * the headers came at once and the body more than a minute later.
 *
 * The end of the body is awaited through the request events, not `response.finished()`: the
 * client sometimes aborts the body (net::ERR_ABORTED right after the headers), and for an aborted
 * body `finished()` never settles. `requestfailed` counts as the end too — a lost save then shows
 * up in the test's reload checks.
 */
export async function waitForServerAction<T>(
  page: Page,
  trigger: () => Promise<T>,
  timeout = 15_000,
): Promise<T> {
  // Listening before the trigger: a body that ends together with the headers is not missed
  const ended = new Set<Request>()
  const onEnd = (req: Request) => void ended.add(req)
  page.on('requestfinished', onEnd)
  page.on('requestfailed', onEnd)
  try {
    const [response, result] = await Promise.all([
      page.waitForResponse(
        (res) => res.request().method() === 'POST' && !!res.request().headers()['next-action'],
        { timeout },
      ),
      trigger(),
    ])
    const request = response.request()
    await expect
      .poll(() => ended.has(request), { message: 'server action response body never ended', timeout: 30_000 })
      .toBe(true)
    return result
  } finally {
    page.off('requestfinished', onEnd)
    page.off('requestfailed', onEnd)
  }
}

/**
 * Waits until React has hydrated the element (it carries React's `__reactProps$…` key).
 * A click or a typed value that lands on server-rendered HTML before hydration is lost —
 * e.g. the account menu doesn't open after `goto(..., { waitUntil: 'domcontentloaded' })`.
 * Use it instead of `networkidle` before the first interaction with a freshly loaded page.
 */
export async function waitForHydration(target: Locator) {
  await expect
    .poll(() => target.evaluate((el) => Object.keys(el).some((key) => key.startsWith('__reactProps$'))), {
      message: 'element is not hydrated by React',
    })
    .toBe(true)
}

/**
 * Types a credential into a React-controlled input without leaking it into the HTML report.
 * `locator.fill(value)` is reported as the step «Fill "<value>"», and CI uploads that report from a
 * public repo; an `evaluate` step is reported as plain «Evaluate». Waits for hydration first:
 * a value set before React attaches its handlers never reaches component state.
 */
export async function fillSecret(input: Locator, value: string) {
  await waitForHydration(input)
  await input.evaluate((el: HTMLInputElement, v) => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setValue.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}
