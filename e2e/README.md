# E2E Tests — last-episode

Playwright test suite for https://www.episode.watch. The tests run against **production**
under two dedicated test accounts, one worker, chromium only.

## CI/CD (GitHub Actions)

Tests run automatically via `.github/workflows/e2e.yml`:

| Trigger | What runs | Time |
|---|---|---|
| Pull request to `main` | smoke only — tests tagged `@smoke` (`--grep @smoke`) plus the setup projects | ~2 min |
| Push to `main` | full suite, all projects | ~5 min |

Smoke covers the critical paths (login, auth guard, library → media page, search + add dialog,
status change, episode toggle) plus a render check of stats / recommendations / community / profile.
To add a test to smoke, pass `{ tag: '@smoke' }` as the second argument of `test(...)`.
Keep destructive (TC-AUTH-010 logout, deletes) and slow (`auto-complete-status.spec`) tests out of it.

CI runs are queued (`concurrency: e2e-production`): they share the test accounts on prod.
Traces and videos are off in CI — the repo is public and the report is uploaded as an artifact
(they would carry session cookies). Screenshots on failure stay on. Locally both are kept on failure.

### Required GitHub secrets

| Secret | Where to get it |
|---|---|
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | Main test account (owns the seeded library) |
| `TEST_USER2_EMAIL` / `TEST_USER2_PASSWORD` | Second test account ("friend") for social scenarios |
| `VERCEL_BYPASS_SECRET` | Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation |

They are **environment secrets** of the `Production` environment (**GitHub → Repository → Settings → Environments → Production**),
not repository secrets — the job declares `environment: { name: Production, deployment: false }` to read them.
CI and local runs use different account pairs.

---

## Local setup

```bash
cd e2e
npm ci
npx playwright install --with-deps chromium
cp .env.example .env
# Fill in TEST_USER_*, TEST_USER2_* (and optionally VERCEL_BYPASS_SECRET)
```

Both accounts must be real, confirmed accounts on the target site.

```bash
npm test                         # everything
npm run test:smoke               # what PRs run in CI (setup projects included)
npm run test:headed              # visible browser
npx playwright test tests/library/           # one area (setup + seed run first)
npx playwright test --project=guest          # signed-out specs only
npx playwright test --list --grep @smoke     # what smoke would run, by project
```

`support/global-setup.ts` is the only environment gate: missing credentials or an unreachable
`BASE_URL` fail the run in seconds — locally too. Tests never skip because of the environment.

---

## Projects

Defined in `playwright.config.ts` (setup + dependencies pattern):

| Project | Specs | Session | Depends on |
|---|---|---|---|
| `setup` | `tests/setup/auth.setup.ts` — UI login of both users → `.auth/user.json`, `.auth/friend.json` | none | — |
| `seed` | `tests/setup/seed.setup.ts` — `SEED_TITLES` in the user's library | user | `setup` |
| `guest` | `tests/guest/**` — login / register / email-confirmation pages, auth guard | none | — |
| `user` | every other spec | user | `seed` |
| `logout` | `tests/auth/logout.spec.ts` (TC-AUTH-010) | user | `user` |

- In `user` a plain `page` is already signed in — no login fixture needed.
- `logout` runs last on purpose: `signOut()` is global and revokes every session of the user.
  The next run's `setup` logs in again, so `.auth/` never needs to be deleted by hand.
- `--grep` filters only the projects that are run directly. `setup` / `seed` are dependencies of
  `user` and always run in full, also with `--grep @smoke`. Running `--project=logout` pulls in
  the whole `user` project.
- `.auth/` holds live session cookies and is gitignored.

## Structure

```
e2e/
  fixtures/index.ts   # the only import point of `test` / `expect` for specs
  pages/              # Page Object Model classes (one per page)
  support/
    actions.ts        # waitForServerAction, fillSecret
    auth-state.ts     # .auth/*.json paths
    test-data.ts      # SEED_TITLES + THROWAWAY_TITLES registry
    global-setup.ts   # preflight: credentials + BASE_URL reachability
  tests/
    setup/            # projects `setup` and `seed`
    guest/            # project `guest`
    auth/  library/  media/  search/  stats/  community/  profile/  recommendations/
```

## Fixtures (`fixtures/index.ts`)

- POM fixtures: `libraryPage`, `searchPage`, `mediaPage`, `navbar`, `loginPage`, `registerPage`,
  `statsPage`, `communityPage`, `profilePage`, `recommendationsPage` (the last four are empty
  stubs, each area fills in its own class).
- `friendPage` — a page signed in as the second user, in its own browser context (closed in teardown).
- `throwawayTitle(key)` — adds the area's title from `THROWAWAY_TITLES` to the user's library via
  the search UI and returns `{ mediaUrl, title }`; deletes it via the library UI in teardown.
  A leftover row of the same title (interrupted run) is deleted first, so the test always starts
  from a fresh row: default status «Хочу посмотреть», no progress. Each call adds 60 s to the test timeout.

## Test data (`support/test-data.ts`)

- `SEED_TITLES` — Inception, Interstellar (movies), Chernobyl (TV, 1 season × 5) — always in the
  user's library, specs never delete them. The CI account starts empty, `seed` adds them.
- `THROWAWAY_TITLES` — one title per area, each identified by `kind + tmdbId`:

| Key | Area | Title | Kind / TMDB id |
|---|---|---|---|
| `library` | library & search | Ход королевы (The Queen's Gambit) — 1 season × 7 | tv 87739 |
| `media` | media page & episodes | Дрянь (Fleabag) — 2 seasons × 6 | tv 67070 |
| `recs` | AI recommendations | Поваккатси (Powaqqatsi) | movie 24348 |
| `social` | friends & profiles | Самсара (Samsara) | movie 89708 |
| `stats` | statistics | Барака (Baraka) | movie 14002 |

## Rules for specs

1. **Locators:** `getByRole` / `getByLabel` / `getByText` first, existing `data-testid` are fine.
   No raw `[data-testid^=…]` in specs — such locators live in the POM.
2. **Waiting:** no `waitForTimeout`, no `networkidle`. Wait with web-first assertions or for the
   server action: `waitForServerAction(page, () => button.click())` (`support/actions.ts`).
3. **Data isolation:** a test that changes data works on its own throwaway title (`throwawayTitle`)
   or restores the original state in `finally` / a fixture. Never assert the total number of cards
   in the library — other runs add their own titles.
4. **One throwaway title per area**, areas never touch each other's titles.
5. **Security:** no `context.request` / `page.request` with a signed-in context — on a timeout it
   prints the session cookie into the public CI log. Check the session by navigating. Don't hardcode
   usernames, read them from the session (`NavbarPage.getOwnUsername`). Type credentials with
   `fillSecret`, not `fill` — the report shows `Fill "<value>"` steps.
6. **IDs and tags:** test ids are `TC-<AREA>-NNN`, new numbers continue the existing ones. `@smoke`
   only on fast, critical, non-destructive tests.
7. **App code** (new `data-testid` / `aria-label`) is changed only when there is no other way, in a
   separate PR that is merged and deployed before the tests (CI tests prod, not the PR preview).
8. **Done means:** `npx tsc --noEmit` is clean, the area's specs pass with `--repeat-each=3` against
   prod, the full suite is still green, this README is updated.
