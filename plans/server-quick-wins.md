## Goal
Make the server do less on every click and page load: no full title-page re-render per episode click, fewer and narrower DB queries.

## Approach
- **Episode/rating clicks stop re-rendering the page.** In Next 16, any `revalidatePath` inside a server action re-renders the page the user is on (`next/dist/server/web/spec-extension/revalidate.js`: `TODO: only revalidate if the path matches`).
  - Drop it from `toggleEpisode`, `markSeason`, `markUpToEpisode`, `markAllTitle` and `updateRating`. The title page keeps progress in client state, so nothing there goes stale.
  - Keep it in `updateStatus`, which is rare and changes the episodes on the page, and in `watchNextEpisode`, which is called from the library itself.
  - Library freshness after Back: a client module flag `markLibraryStale()`, plus `<RefreshIfStale/>` on the library page that calls `router.refresh()` once on mount.
- ~~**Proxy skips prefetches.**~~ **Dropped.** A prefetch still renders `(app)/layout.tsx`. There `getServerUser()` may refresh an expired token but cannot set cookies from a Server Component. The rotated refresh token would be lost, and Supabase reuse detection can then revoke the session. Token refresh has to stay in the proxy. The gain was small anyway: prefetches run in the background.
- **Library:**
  - New `getLibraryCards` selects only the card columns.
  - `getLibraryGenres` is skipped when there are no filters, since `items` already holds the whole library.
  - `getContinueWatching` makes one RPC instead of 2 queries per title.
- **RLS:** one migration with `ALTER POLICY` on every policy, wrapping `auth.uid()` as `(select auth.uid())`. Names, roles and commands stay as they are.
- **Stats/profile:** a `get_watched_minutes(item_ids uuid[])` RPC returns watched minutes per title instead of shipping every episode row.
  - This also fixes silent truncation at 1000 rows and over-long `.in()` URLs.
  - The result is fed into `computeStats` as one aggregated entry per title, so the function itself does not change.
- **Add title:** `createSeasonsAndEpisodes` makes one seasons insert and one episodes insert instead of 2 per season.
- **Recommendations page:** its two independent queries go into `Promise.all`.

## Checklist
- [x] Revalidation and library stale flag
- [x] ~~Proxy prefetch skip~~ (dropped, see above)
- [x] Migration: RLS initplan + `get_watched_minutes` + `get_continue_watching`. Applied as `20261005204527`; advisors show 0 `auth_rls_initplan`
- [x] Library: narrow select, skip genres query
- [x] Continue-watching RPC (needs the migration)
- [x] Stats + profile via RPC (needs the migration). Checked read-only against live data: same results for all 6 users
- [x] Batch create seasons/episodes
- [x] Recommendations `Promise.all`
- [ ] build + lint after every commit; Supabase advisors show 0 `auth_rls_initplan`

## Risks / open questions
- `ALTER POLICY` is applied straight to production. The predicates are semantically identical; only the evaluation plan changes.
- Batch insert: if the seasons insert fails, nothing is created; the error is logged. The title itself exists, and the diff sync creates the missing seasons when the title is first opened.
- The code in `05149da` calls the new RPCs. Deploying it before the migration breaks the library («Продолжить»), stats and the profile.
