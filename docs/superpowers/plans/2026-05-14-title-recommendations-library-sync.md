# Title Recommendations, Library Copy, and Season Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement related-title recommendations, consistent add-to-library dialogs, public-library copying, planned-season progress correctness, AI stream cleanup, questionnaire gating, and TMDB season sync.

**Architecture:** Shared add UI calls options-aware server actions. TMDB service owns external lookups; Supabase progress helpers own idempotent season/episode upserts. Page/server components load enriched data in parallel and keep user-specific writes in server actions.

**Tech Stack:** Next.js App Router, TypeScript, Supabase SSR/client, TMDB API, shadcn/ui, Framer Motion, Sonner.

---

### Task 1: Shared Add Dialog and Search Card Reuse

**Files:**
- Create: `components/library/AddToLibraryDialog.tsx`
- Modify: `components/search/TmdbResultCard.tsx`

- [x] Extract the status/rating dialog currently embedded in `TmdbResultCard` into `AddToLibraryDialog`.
- [x] Props must include `title`, `type`, `posterUrl`, `releaseYear`, `state`, `status`, `rating`, `onStatusChange`, `onRatingChange`, `open`, `onOpenChange`, and `onConfirm`.
- [x] Keep rating half-star behavior and Russian copy unchanged.
- [x] Update `TmdbResultCard` to keep only card state and pass dialog props.

### Task 2: Options-Aware Add Actions and AI Recommendation Cards

**Files:**
- Modify: `app/actions/recommendations.ts`
- Modify: `components/recommendations/RecommendationCard.tsx`

- [x] Change `addRecommendedTitle` to accept `CreateMediaItemOptions`.
- [x] Reuse rating/status validation semantics from `app/actions/tmdb.ts`.
- [x] Reject `completed` TV/anime additions with planned seasons.
- [x] Replace direct add button behavior in `RecommendationCard` with `AddToLibraryDialog`.

### Task 3: Public Library Copy

**Files:**
- Modify: `components/profile/ProfileMediaCard.tsx`
- Modify: `components/profile/ProfileMediaRow.tsx`
- Modify: `components/profile/ProfileLibrarySections.tsx`
- Modify: `app/(app)/profile/[username]/media/[id]/page.tsx`

- [x] Add compact "Добавить" controls to public profile cards without nesting buttons inside links.
- [x] Use `AddToLibraryDialog` with public item metadata.
- [x] On public detail pages, show an add control near status/rating badges.
- [x] Existing public read-only progress stays read-only.

### Task 4: Owned Title Related Recommendations

**Files:**
- Modify: `lib/tmdb/tmdb.service.ts`
- Create: `components/media/TitleRecommendations.tsx`
- Modify: `app/(app)/media/[id]/page.tsx`

- [x] Add TMDB service functions for collection/movie recommendations and TV recommendations.
- [x] Normalize related items into `TmdbSearchResult` shape with poster paths and media type.
- [x] Render a "Рекомендации" section after notes/cast and before progress.
- [x] Exclude the current title and mark already-added titles using existing user TMDB IDs.

### Task 5: Season Sync and Progress Indicator Correctness

**Files:**
- Modify: `lib/supabase/progress.ts`
- Modify: `app/(app)/media/[id]/page.tsx`
- Modify: `components/media/SeasonAccordion.tsx`

- [x] Add idempotent `syncSeasonsAndEpisodes` helper using existing unique keys.
- [x] Preserve `is_watched` and `watched_at` for existing episodes.
- [x] Best-effort sync TV/anime seasons from TMDB before loading seasons on owned detail pages.
- [x] Compute title watched indicator only when every season has created episodes and no incomplete/planned season exists.

### Task 6: Recommendation Wizard and Stream Cleanup

**Files:**
- Modify: `components/ui/Stepper.tsx`
- Modify: `components/recommendations/RecommendationQuestionnaire.tsx`
- Modify: `components/recommendations/RecommendationsPage.tsx`
- Modify: `app/api/recommendations/generate/route.ts`

- [x] Add Stepper prop that rejects indicator clicks beyond a supplied max reachable step.
- [x] In questionnaire, max reachable step is 1 until content type is selected, 2 until mood is selected, then 3.
- [x] Keep next/complete button disabled behavior intact.
- [x] Strip leaked Markdown code fences from intro chunks on server and client before display.

### Task 7: Verification

**Files:**
- No source files expected.

- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Fix any lint/build errors caused by this implementation.
