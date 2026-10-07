# E2E Tests — last-episode

Playwright test suite for https://www.episode.watch. The tests run against **production**
under two dedicated test accounts, one worker, chromium only.

## CI/CD (GitHub Actions)

Tests run automatically via `.github/workflows/e2e.yml`:

| Trigger | What runs | Time |
|---|---|---|
| Pull request to `main` | smoke only — tests tagged `@smoke` (`--grep @smoke`) plus the setup projects | ~1–2 min |
| Push to `main` | full suite, all projects | ~6–8 min |

Smoke (16 tests + setup/seed) covers the critical paths: login, auth guard and the signed-in
redirect, every dock section, library → title page, search + add dialog, status change, episode
tick persisted after reload, the mocked recommendation stream, and a render check of stats /
community / profile. To add a test to smoke, pass `{ tag: '@smoke' }` as the second argument of
`test(...)`. Keep out of it: TC-AUTH-010 (global logout), the serial two-user `tests/social/friends.spec.ts`,
and slow data-changing tests (title lifecycle, stats delta, `auto-complete-status.spec`).

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
    actions.ts        # waitForServerAction, waitForHydration, fillSecret
    auth-state.ts     # .auth/*.json paths
    test-data.ts      # SEED_TITLES + THROWAWAY_TITLES registry
    global-setup.ts   # preflight: credentials + BASE_URL reachability
  tests/
    setup/            # projects `setup` and `seed`
    guest/            # project `guest`
    auth/  library/  search/  media/  stats/  navigation/  profile/  recommendations/  social/
```

## Fixtures (`fixtures/index.ts`)

- POM fixtures: `libraryPage`, `searchPage`, `mediaPage`, `navbar`, `loginPage`, `registerPage`,
  `statsPage`, `communityPage`, `profilePage`, `recommendationsPage`.
- `friendPage` — a page signed in as the second user, in its own browser context (closed in teardown).
- `throwawayTitle(key)` — adds the area's title from `THROWAWAY_TITLES` to the user's library via
  the search UI and returns `{ mediaUrl, title }`; deletes it via the library UI in teardown.
  A leftover row of the same title (interrupted run) is deleted first, so the test always starts
  from a fresh row: default status «Хочу посмотреть», no progress. Each call adds 60 s to the test timeout.

## Test data (`support/test-data.ts`)

- `SEED_TITLES` — Inception, Interstellar, The Matrix, Parasite (movies), Chernobyl (TV) — always in
  the user's library, specs only read them (TC-LIB-SORT-003 changes a seed movie's status and
  restores it). The CI account starts empty, `seed` adds them. Five on purpose: /recommendations
  locks the questionnaire below 5 library titles (a server-side count, no mock lifts it).
- `THROWAWAY_TITLES` — one title per area, each identified by `kind + tmdbId`:

| Key | Area | Title | Kind / TMDB id |
|---|---|---|---|
| `library` | library & search | Ход королевы (The Queen's Gambit) — 1 season × 7 | tv 87739 |
| `media` | media page & episodes | Дрянь (Fleabag) — 2 seasons × 6 | tv 67070 |
| `recs` | AI recommendations | Поваккатси (Powaqqatsi) | movie 24348 |
| `social` | friends & profiles | Самсара (Samsara) — throwaway for the user, permanent in the friend's library | movie 89708 |
| `stats` | statistics | Барака (Baraka) | movie 14002 |

## Rules for specs

1. **Locators:** `getByRole` / `getByLabel` / `getByText` first, existing `data-testid` are fine.
   No raw `[data-testid^=…]` in specs — such locators live in the POM.
2. **Waiting:** no `waitForTimeout`, no `networkidle`. Wait with web-first assertions or for the
   server action: `waitForServerAction(page, () => button.click())` (`support/actions.ts`) — it
   waits for the end of the action's response body: Next sends the headers before the action has
   run. Before the first click after `goto(..., 'domcontentloaded')` call `waitForHydration`.
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

---

## Coverage by area

| Area | Specs | IDs | What is checked |
|---|---|---|---|
| Auth | `guest/auth.spec`, `guest/guards.spec`, `auth/*` | TC-AUTH-001…016 | login (ok / wrong password / empty), register validation, «email sent» screen, confirmation link, guest → /login on every app route, signed-in → /library from /login and /register, stored session, logout (last) |
| Library | `library/*` | TC-LIB-001…006, 008…012, TC-LIB-SORT-001…003 | cards render; status / type / genre / rating filters really filter, counter, reset; title lifecycle search → add with status → library → delete; cancelled delete; sort default, bad params, «Недавно обновлённые»; changes on the title page visible after «Назад»; «Продолжить просмотр» moves to the next episode |
| Search | `search/search.spec` | TC-SEARCH-001…004, 006, 009, 010 | results, empty message, clear, new query replaces results, add dialog shows the clicked title, cancel adds nothing |
| Title page | `media/*` | TC-MEDIA-001…005, 007…013, TC-AUTO-001…005 | status, episode tick / untick, «Отметить сезон», «Отметить по эту серию» (season only / all previous), «Отметить всё», rating, notes — each re-checked after a reload; genre link → filtered library; related title overview → add; unknown id → 404; «Все серии отмечены → Просмотрено?» toast |
| Stats | `stats/stats.spec` | TC-STATS-001, 003…005 | page renders; adding a title to «Брошено» moves its count by exactly +1 and back; status / genre rows open the filtered library; watch timeline |
| Navigation & profile | `navigation/*`, `profile/own-profile.spec` | TC-NAV-001…003, TC-PROFILE-001/003 | every dock item, logo, account menu → own profile; own profile shows @username, stats, seeded library; unknown username → 404 |
| Recommendations | `recommendations/*` | TC-REC-004…008 | questionnaire → intro → skeletons → 5 cards, card → details → add, generation error, «Новая анкета», taste profile update — Groq is never called |
| Social | `social/*` | TC-COMM-001/002, TC-SOCIAL-001…007 | user search; friend request decline / cancel / accept / remove with two users; friend's profile with «Что у нас общего»; «У друзей» on a title → friend's read-only title page; adding a friend's favourite from their profile |

### Area notes

- **«Брошено» is reserved** for the stats delta test (TC-STATS-003): other specs never move a title
  into it, so the count can only change by that test.
- **Tick episodes before changing the status** in a test: `updateStatus` re-renders the title page
  (revalidatePath) and the late render resets the season checkboxes in the UI.
- **Recommendations:** `fixtures/recommendations.mock.ts` (imported by the spec, not part of
  `fixtures/index.ts`) routes every request to `/api/recommendations/*` into a mock or an abort; the
  spec's auto fixture fails the test if any request reached no mock. `route.fulfill()` delivers the
  body in one chunk, so `generate({ holdCards: true })` holds the cards until `releaseCards(page)` to
  show intro → skeletons → cards. The card «Поваккатси» is real: «Добавить» runs the real server
  action, the title is removed before the test and in `finally`. A missing taste profile is fine —
  every test gets one through the mocked «Обновить профиль» (page state only).
- **Social (`friends.spec`, serial):** `beforeAll` / `afterAll` reset user ↔ friend to «no link»
  through `CommunityPage.disconnect` (decline incoming, cancel outgoing, remove friend — re-checked
  until the card says «Добавить»), so the set starts clean after an interrupted run. The friend's
  library belongs to this spec: «Начало» and «Самсара», both «Просмотрено» with rating 9 («Смотрели
  оба» skips «Хочу посмотреть», «Любимое» needs ≥ 8 — `lib/compare.ts`); `beforeAll` re-adds a title
  that is missing or in another state. Both accounts need `is_library_public = true` (the DB default,
  there is no UI to change it). TC-SOCIAL-004…007 depend on the friendship made in TC-SOCIAL-003.
- **Related titles (TC-MEDIA-012)** pick a TMDB recommendation of «Дрянь» that is not in the library
  and has an overview; if none qualifies the test fails with the candidate list instead of skipping.
- **Dock items have no accessible name** until hovered — `NavbarPage.clickDockItem` hovers the item by
  position and asserts its name before clicking.

