# Title Recommendations, Library Copy, and Season Sync Design

## Goal
Make title detail pages more useful by surfacing related TMDB titles, allowing one-click copying from public libraries and recommendation cards with explicit status/rating, fixing recommendation wizard guards and stream artifacts, and keeping TV/anime seasons current after TMDB updates.

## Scope
- Add a "Рекомендации" section to owned title pages with TMDB collection/sequel-style items and similar recommendations.
- Use the same add-to-library status/rating flow for TMDB search, title recommendations, AI recommendations, and public-library titles.
- Hide the "Тайтл просмотрен" progress check when any planned/incomplete season exists.
- Prevent stray Markdown code fences from leaking into the AI recommendation intro.
- Block questionnaire step indicator navigation until required prior steps are filled.
- Sync newly released TV/anime seasons and episodes from TMDB into existing library items.

## Approach
- Treat TMDB as the source of truth for related content and season refreshes. The local database remains the source of truth for user state: status, rating, notes, and watched episodes.
- Extract reusable add-to-library UI into a focused client component. Search results, AI recommendation cards, owned title recommendations, and public profile pages call the same server action with `tmdb_id`, `MediaType`, `status`, and `rating`.
- Add idempotent season sync helpers that upsert seasons and episodes by existing unique keys. Existing watched state is preserved, while names, runtimes, and `episode_count` are refreshed.
- Keep questionnaire gating in the Stepper API, not only in the page-specific next button. The recommendation questionnaire supplies the maximum reachable step.

## Data Flow
- Owned media page loads item, seasons, cast, and related TMDB recommendations in parallel where possible.
- For TV/anime pages, the server attempts a best-effort TMDB season sync before reading seasons. TMDB failures do not block the page.
- Add actions validate rating/status, fetch fresh TMDB details, reject completed TV/anime additions that contain planned seasons, create the media item, create seasons/episodes, and run anime filler detection as before.
- Public-library pages pass the public item metadata to the reusable add dialog, but the write still uses the current authenticated user and fresh TMDB details.

## UX Rules
- Related recommendations are compact cards with poster, title, year, type, reason/source label, and "Добавить" button.
- Add buttons always open a dialog before saving. Defaults: status `planned`, rating empty.
- Already-added titles show "В библиотеке" and cannot be added again.
- The watched check appears only when all seasons have at least one episode, each season's `episode_count` matches created episodes, and every created episode is watched.
- Step indicators for future questionnaire steps look disabled until prerequisites are satisfied.

## Risks
- TMDB collection data can be sparse, so similar titles act as fallback and are deduplicated by TMDB ID.
- Automatic sync adds network work to detail pages. It is scoped to TV/anime and runs best-effort; if it becomes slow, the same action can be moved behind a manual refresh button later.
- Existing server actions use direct Supabase auth in API routes only; new server actions must use `getServerUser()`.

## Verification
- `npm run lint` must pass.
- `npm run build` must pass.
- Manual checks: add from search, add from AI recommendation, add from public library, owned detail recommendations render, questionnaire indicators block future navigation, planned-season check hides the watched icon.
