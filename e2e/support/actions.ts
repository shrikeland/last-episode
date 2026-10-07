import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Runs `trigger` and waits for the Next.js server action it fires: a POST whose request carries
 * the `next-action` header. Use instead of a fixed sleep after clicks that save data — the click
 * returns right away, and a navigation started before the action answered may cancel the save.
 * Resolves with whatever `trigger` returns.
 */
export async function waitForServerAction<T>(
  page: Page,
  trigger: () => Promise<T>,
  timeout = 15_000,
): Promise<T> {
  const [, result] = await Promise.all([
    page.waitForResponse(
      (res) => res.request().method() === 'POST' && !!res.request().headers()['next-action'],
      { timeout },
    ),
    trigger(),
  ])
  return result
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
