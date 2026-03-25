# Testing — last-episode

## Current State
- Unit tests: none
- Integration tests: none (manual only)
- E2E (Playwright): **not yet added**

---

## Build Verification (required on every unit)
```bash
npm run build   # 0 TypeScript errors, 0 build errors
npm run lint    # 0 ESLint errors
```
This is the minimum quality gate before any unit is considered done.

---

## Planned: Playwright E2E Suite

### Setup (when adding Playwright)
```bash
npm init playwright@latest
```
Config: `playwright.config.ts` at project root.

Test environment:
- Supabase local dev (`supabase start`) with seeded test data
- Isolated test user (separate from personal account)
- `.env.test` with local Supabase URL + anon key

### Required Test Suite (critical flows)

| Test | File | Priority |
|------|------|----------|
| Login / logout | `tests/auth.spec.ts` | P0 |
| Add title to library (TMDB search) | `tests/library.spec.ts` | P0 |
| Edit episode progress (mark watched) | `tests/episode.spec.ts` | P0 |
| Change watch status | `tests/library.spec.ts` | P0 |
| Stats page loads + correct totals | `tests/stats.spec.ts` | P1 |
| Recommendation stream renders | `tests/recommendations.spec.ts` | P1 |

### Playwright Patterns for This Project
- Auth state: use `storageState` to reuse login session across tests
- TMDB calls: intercept with `page.route()` to use fixture data (avoid flaky network)
- Supabase: seed with `supabase db seed` before test run
- Selectors: prefer `data-testid` attributes over CSS selectors for stability

### Flaky Test Strategy
- Retries: `retries: 2` in CI config
- Traces: always-on in CI (`trace: 'on-first-retry'`)
- Screenshots on failure: enabled

---

## Manual Test Checklist (until Playwright is added)
Before finishing any change that touches auth, DB, or critical UI:
- [ ] Login / logout works
- [ ] Can add a title from TMDB search
- [ ] Episode marking saves and persists on reload
- [ ] Status change reflects in library grid
- [ ] Stats page shows correct data
- [ ] `npm run build` passes