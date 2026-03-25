# Architecture — last-episode

Media tracker web app: users add movies/TV/anime via TMDB and track watch progress.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (tweakcn tokens) |
| Animations | Framer Motion, Aceternity UI (decorative only) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password, SSR-based) |
| External API | TMDB API (metadata, search, posters) |
| AI | Groq API (streaming recommendations) |
| Deploy | Vercel (frontend) + Supabase Cloud |

---

## Directory Structure

```
app/                    # Next.js App Router pages + API routes
  (auth)/               # login/signup pages (no layout)
  (protected)/          # authenticated pages (with sidebar layout)
    library/            # main collection grid
    title/[id]/         # title detail + episode tracker
    stats/              # watch statistics
    search/             # TMDB search
    recommendations/    # AI recommendations (Groq streaming)
  api/
    recommendations/    # Server-Sent Events endpoint (Groq stream)
    tmdb/               # TMDB proxy routes

components/             # Reusable UI components
  ui/                   # shadcn/ui primitives
  library/              # library-specific components
  recommendations/      # recommendation UI

lib/
  supabase/
    server.ts           # Supabase client for Server Components (cookies)
    client.ts           # Supabase client for Client Components (browser)
  tmdb.ts               # TMDB API wrapper
  utils.ts              # shared utilities

types/                  # Shared TypeScript types (DB entities, TMDB shapes)
supabase/migrations/    # All DB schema changes (source of truth)
```

---

## Data Model

```sql
-- Supabase Auth handles users table

media_items             -- user's collection
  id uuid PK
  user_id uuid FK -> auth.users
  tmdb_id integer
  type: 'movie' | 'tv' | 'anime'
  title text
  original_title text
  overview text
  poster_url text
  release_year integer
  genres jsonb           -- [{id, name}]
  status: 'watching' | 'completed' | 'planned' | 'dropped' | 'on_hold'
  rating integer (1-10, nullable)
  notes text (nullable)
  runtime_minutes integer (nullable)  -- movies: TMDB movie.runtime
  created_at, updated_at

seasons
  id uuid PK
  media_item_id uuid FK -> media_items
  season_number integer
  name text
  episode_count integer
  tmdb_season_id integer

episodes
  id uuid PK
  season_id uuid FK -> seasons
  episode_number integer
  name text
  runtime_minutes integer (nullable)  -- from TMDB episode.runtime
  is_watched boolean
  watched_at timestamptz (nullable)
  tmdb_episode_id integer
```

RLS: all tables locked to `auth.uid() = user_id`.

---

## Key Patterns

### Auth Flow
- Middleware (`middleware.ts`) protects all `/` routes except `/(auth)/*`
- Server Components use `lib/supabase/server.ts` (reads cookies)
- Client Components use `lib/supabase/client.ts` (browser session)
- Never call Supabase Auth methods from Server Actions directly — use the SSR client

### TMDB Integration
- All TMDB calls go through `/api/tmdb/*` proxy routes (keeps API key server-side)
- Poster URLs: `https://image.tmdb.org/t/p/w500{poster_path}`
- Anime detection: genre_ids includes 16 (Animation) + origin_country JP

### AI Recommendations (Groq)
- Endpoint: `/api/recommendations` — streams Server-Sent Events
- Uses `llama-3.3-70b-versatile` model via Groq SDK
- Client reads the stream with `EventSource` / `ReadableStream`
- Recommendation context built from user's `media_items` (genres, statuses, titles)

### Search
- Debounce: `useRef` + 400ms timeout (NOT `useState` — prevents stale closure issues)
- Searches both movies and TV in parallel, merges results

---

## Constraints & Known Limitations
- `@supabase/supabase-js` must stay at `^2.x` (SSR package incompatible with v3)
- Playwright not yet added — integration tests are manual for now
- No light theme (dark only by design)
- TMDB `runtime` for episodes falls back to `episode_run_time[0]` when per-episode data missing