## Goal
Make the server do less on every click and page load: no full title-page re-render per episode click, no Auth call per prefetch, fewer and narrower DB queries.

## Approach
- **Episode/rating clicks stop re-rendering the page.** In Next 16, any `revalidatePath` inside a server action re-renders the page the user is on (`next/dist/server/web/spec-extension/revalidate.js`: `TODO: only revalidate if the path matches`).
  - Drop it from `toggleEpisode`, `markSeason`, `markUpToEpisode`, `markAllTitle` and `updateRating`. The title page keeps progress in client state, so nothing there goes stale.
  - Keep it in `updateStatus`, which is rare and changes the episodes on the page, and in `watchNextEpisode`, which is called from the library itself.
  - Library freshness after Back: a client module flag `markLibraryStale()`, plus `<RefreshIfStale/>` on the library page that calls `router.refresh()` once on mount.
- **Proxy skips prefetches.** The matcher gets `missing` for the `next-router-prefetch` and `purpose: prefetch` headers. A prefetch of a dynamic page only fetches up to `loading.tsx`, and auth is still checked on the real navigation and by the layout guard.
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
- [ ] Revalidation and library stale flag
- [ ] Proxy prefetch skip
- [ ] Migration: RLS initplan + `get_watched_minutes` + `get_continue_watching`; apply, rename file to the applied version
- [ ] Library: narrow select, skip genres query, continue-watching RPC
- [ ] Stats + profile via RPC
- [ ] Batch create seasons/episodes
- [ ] Recommendations `Promise.all`
- [ ] build + lint after every commit; Supabase advisors show 0 `auth_rls_initplan`

## Risks / open questions
- `ALTER POLICY` is applied straight to production. The predicates are semantically identical; only the evaluation plan changes.
- A prefetch request with no session now reaches the page render; the layout guard redirects it to /login.
- Batch insert: if the seasons insert fails, nothing is created. Before, a failing season was skipped and the rest still went in.
