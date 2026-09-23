# E2E Tests — last-episode

Playwright test suite for https://www.episode.watch

## CI/CD (GitHub Actions)

Tests run automatically on every push to `main` and on pull requests via `.github/workflows/e2e.yml`.

### Required GitHub secrets

| Secret | Where to get it |
|---|---|
| `TEST_USER_EMAIL` | Email of the dedicated test account in Supabase |
| `TEST_USER_PASSWORD` | Password of the test account |
| `VERCEL_BYPASS_SECRET` | Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation |

Add secrets at: **GitHub → Repository → Settings → Secrets and variables → Actions**

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
