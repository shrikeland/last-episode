/**
 * Preflight before any test runs.
 *
 * Specs skip themselves when BASE_URL is unreachable — handy in sandboxes, but in CI
 * that turned a broken prod domain into a green run (55 of 57 tests skipped), and
 * empty credentials turned every login into a 20s wait × 3 retries until the job
 * timed out. In CI both are hard errors here, so the run fails in seconds with a
 * readable message instead. Locally they are only warnings.
 */
export default async function globalSetup() {
  const isCI = !!process.env.CI
  const problems: string[] = []

  const missing = ['TEST_USER_EMAIL', 'TEST_USER_PASSWORD'].filter((name) => !process.env[name])
  if (missing.length > 0) {
    problems.push(
      `${missing.join(', ')} is empty. In GitHub Actions these secrets live in the "Production" ` +
        `environment — the job must declare \`environment: Production\`.`,
    )
  }

  const baseUrl = process.env.BASE_URL || 'https://www.episode.watch'
  try {
    // Node's fetch validates TLS, so a hijacked DNS record / expired cert fails here
    const res = await fetch(`${baseUrl}/login`, { signal: AbortSignal.timeout(15_000) })
    if (res.status >= 500 || res.status === 403) {
      problems.push(`${baseUrl}/login answered HTTP ${res.status}.`)
    }
  } catch (err) {
    const cause = err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : String(err)
    problems.push(`${baseUrl} is not reachable: ${cause}. Check DNS / TLS of the domain.`)
  }

  if (problems.length === 0) return

  const message = `E2E preflight failed:\n  - ${problems.join('\n  - ')}`
  if (isCI) throw new Error(message)
  console.warn(`${message}\n(not CI — continuing, affected tests will skip or fail)`)
}
