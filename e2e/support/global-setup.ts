/**
 * Preflight before any test runs — the only reachability / config gate of the suite.
 *
 * Specs used to skip themselves when BASE_URL was unreachable — in CI that turned a broken
 * prod domain into a green run (55 of 57 tests skipped), and empty credentials turned every
 * login into a 20s wait × 3 retries until the job timed out. Now both are hard errors here,
 * locally as well as in CI: the run fails in seconds with a readable message, and a test
 * never skips because of the environment.
 */
export default async function globalSetup() {
  const problems: string[] = []

  const missing = ['TEST_USER_EMAIL', 'TEST_USER_PASSWORD', 'TEST_USER2_EMAIL', 'TEST_USER2_PASSWORD'].filter(
    (name) => !process.env[name],
  )
  if (missing.length > 0) {
    problems.push(
      `${missing.join(', ')} is empty. Locally fill them in e2e/.env (see .env.example). ` +
        `In GitHub Actions these secrets live in the "Production" environment — the job must declare ` +
        `\`environment: Production\` and pass them in \`env\`.`,
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

  if (problems.length > 0) {
    throw new Error(`E2E preflight failed:\n  - ${problems.join('\n  - ')}`)
  }
}
