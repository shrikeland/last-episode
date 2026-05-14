## Goal
Ship six related library and recommendation improvements in one coordinated pass.

## Approach
- Extract reusable add-to-library dialog controls from `components/search/TmdbResultCard.tsx`.
- Reuse the dialog from search, AI recommendation cards, public library pages, and owned title recommendation cards.
- Extend TMDB service with recommendation/collection lookup and season refresh support.
- Add idempotent Supabase helpers for syncing seasons/episodes without deleting watched progress.
- Tighten Stepper navigation and AI intro cleanup.

## Checklist
- [x] Add shared add-to-library dialog component.
- [x] Rewire TMDB search cards to use the shared dialog.
- [x] Rewire AI recommendation cards to use the shared dialog and options-aware add action.
- [x] Add public library copy buttons on profile cards/detail pages.
- [x] Add TMDB related-title service and owned media "Рекомендации" section.
- [x] Add idempotent season/episode sync and call it on TV/anime detail load.
- [x] Fix watched title indicator when planned/incomplete seasons exist.
- [x] Block Stepper indicator jumps until required questionnaire steps are filled.
- [x] Strip leaked Markdown code fences from AI recommendation intro streaming.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.

## Risks / open questions
- TMDB related data can be noisy; dedupe by `tmdb_id`, exclude the current title, and cap lists.
- Page-load season sync may add latency. Implement best-effort and non-fatal behavior.
- Public pages are service-client reads, but add actions must still use the current authenticated user via `getServerUser()`.
