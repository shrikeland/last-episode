# last-episode

Personal media tracker for movies, animated films, TV series, and anime. Add titles via TMDB, track watch progress by season and episode, view statistics, and get AI-powered recommendations.

---

## Features

- **Search & add** movies, TV series, anime via TMDB API
- **Watch statuses** — Watching / Completed / Planned / Dropped / On Hold
- **Episode tracker** — mark individual episodes or entire seasons as watched
- **Watch statistics** — total time spent, breakdown by type and status, top genres
- **AI recommendations** — streaming recommendations based on your taste profile (Groq / llama-3.3-70b)
- **Community** — public profiles, explore other users' libraries
- **Dark cinematic UI** — "dark seinen" design system with amber accent

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| Auth & DB | Supabase (PostgreSQL + Auth + RLS) |
| External API | TMDB API |
| AI | Groq API (llama-4-scout-17b-16e-instruct, streaming) |
| Deploy | Vercel + Supabase Cloud |

---

## Local Development

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- TMDB API key — [get one here](https://developer.themoviedb.org/docs/getting-started)
- Groq API key — [get one here](https://console.groq.com)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/shrikeland/last-episode.git
cd last-episode
npm install

# 2. Start local Supabase
supabase start

# 3. Apply migrations
supabase db push

# 4. Configure environment variables
cp .env.example .env.local
# Fill in the values (see below)

# 5. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# TMDB
TMDB_API_KEY=your_tmdb_api_key

# Groq
GROQ_API_KEY=your_groq_api_key
```

For local development, use the URL and keys printed by `supabase start`.

---

## Project Structure

```
app/
  (auth)/          # login, register, email confirmation
  (app)/           # authenticated pages (layout with sidebar)
    library/       # main collection grid
    search/        # TMDB search
    media/[id]/    # title detail + episode tracker
    stats/         # watch statistics
    recommendations/ # AI recommendations
    community/     # public profiles
    profile/[username]/

components/        # reusable UI components
lib/
  supabase/        # server.ts (Server Components), client.ts (Client Components)
  tmdb.ts          # TMDB API wrapper
types/             # shared TypeScript types
supabase/
  migrations/      # database schema (source of truth)
plans/
  patches/         # documented bugs and lessons learned
```

---

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run lint     # eslint
```

---

## Notes

- `@supabase/supabase-js` is pinned to `2.46.2` — do not upgrade without testing (breaking type changes in newer versions)
- All database changes go through `supabase/migrations/` — never edit schema via the Supabase UI
- See `ARCHITECTURE.md` for full system overview and constraints
- See `AGENTS.md` for the AI-assisted development workflow used in this project