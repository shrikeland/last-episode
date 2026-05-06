# Findings

## Repository Context
- Stack: Next.js App Router + TypeScript, Supabase, Tailwind/shadcn.
- Auth guard lives in `app/(app)/layout.tsx`; this task should not touch it.
- Server actions are in `app/actions/*`; DB helpers in `lib/supabase/*`.

## Current Implementation
- Library sorting is controlled by URL params in `components/library/FilterBar.tsx`, parsed in `app/(app)/library/page.tsx`, and executed in `lib/supabase/media.ts`.
- `SortField` currently allows only `created_at`, `title`, `rating`; `release_year` must be added.
- User rating already exists on `MediaItem.rating`, but `components/library/MediaCard.tsx` and profile cards do not render it.
- Search UI is in `components/search/SearchInput.tsx` and `components/search/TmdbResultCard.tsx`.
- Adding media is handled by `app/actions/tmdb.ts` and `lib/supabase/media.ts`; defaults to `status: 'planned'`.
- Rating input uses custom SVG/gradient in `components/media/RatingInput.tsx`; likely cause of distorted stars.
- `components/media/SeasonAccordion.tsx` has title-level and season-level buttons both labeled `Отметить всё`.
- `app/actions/progress.ts:updateStatus` marks all episodes watched whenever status becomes `completed` for non-movie media.
- Public profile library cards are not links. `getUserProfile` uses service client to load public media.
- `lib/tmdb/tmdb.service.ts:getCredits` currently returns actor names only, no photos.

## Constraints
- Do not modify files outside `/Users/hornysennin/Projects/last-episode`.
- Do not revert existing user/staged changes.
- Avoid DB migrations unless truly necessary.
- Build and lint must pass before commit.
