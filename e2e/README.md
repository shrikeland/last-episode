# E2E Tests — last-episode

Playwright test suite for https://www.episode.watch

## CI/CD (GitHub Actions)

Tests run automatically via `.github/workflows/e2e.yml`:

| Trigger | What runs | Time |
|---|---|---|
| Pull request to `main` | smoke only — tests tagged `@smoke` (`--grep @smoke`) | ~2 min |
| Push to `main` | full suite | ~10 min |

Smoke covers the critical paths (login, auth guard, library → media page, search + add dialog,
status change, episode toggle) plus a render check of stats / recommendations / community / profile.
To add a test to smoke, pass `{ tag: '@smoke' }` as the second argument of `test(...)`.
Keep destructive (TC-AUTH-010 logout, TC-LIB-004 delete) and slow (`auto-complete-status.spec`) tests out of it.

### Required GitHub secrets

| Secret | Where to get it |
|---|---|
| `TEST_USER_EMAIL` | Email of the dedicated test account in Supabase |
| `TEST_USER_PASSWORD` | Password of the test account |
| `VERCEL_BYPASS_SECRET` | Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation |

They are **environment secrets** of the `Production` environment (**GitHub → Repository → Settings → Environments → Production**),
not repository secrets — the job declares `environment: { name: Production, deployment: false }` to read them.
If they come through empty, `support/global-setup.ts` fails the CI run in seconds instead of letting every login time out.

---

## Local setup

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
cp .env.example .env
# Fill in TEST_USER_EMAIL, TEST_USER_PASSWORD, and optionally VERCEL_BYPASS_SECRET
```

Run against the deployed app:
```bash
npm test

# Smoke subset only (what PRs run in CI)
npm run test:smoke

# Headed mode (visible browser)
npm run test:headed

# Single area
npx playwright test tests/auth/
```

---

## Structure

```
e2e/
  fixtures/      # Playwright fixture extensions (auth session)
  pages/         # Page Object Model classes
  support/       # Helpers: network reachability, env validation
  tests/         # Test specs, one folder per area
    smoke.spec.ts
    auth/
    search/
    library/
    media/
    stats/
    community/
    profile/
    recommendations/
```

## Auth

Tests use a pre-authenticated session via `storageState`. The first run creates
`support/auth.storage.json` by logging in through the UI — subsequent runs reuse it.
Before each test the fixture checks that the stored session is still accepted
(`/library` doesn't redirect to `/login`) and logs in again if it was revoked —
e.g. by the logout test (TC-AUTH-010). No need to delete the file by hand.
