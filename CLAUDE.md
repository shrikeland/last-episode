# last-episode — Project Rules

## Stack
- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui (tweakcn tokens), Framer Motion
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **External API**: TMDB API (search + metadata)
- **Deploy**: Vercel (frontend) + Supabase Cloud

## Key Commands
```bash
npm run dev       # dev server
npm run build     # production build (run before finishing any unit)
npm run lint      # eslint check
```

## Architecture Constraints
- All DB changes via Supabase migrations (`supabase/migrations/`), never through UI
- Server Components by default; use `'use client'` only when needed (interactivity, hooks)
- Auth handled exclusively via Supabase SSR (`@supabase/ssr`) — never roll custom auth
- RLS must be enabled on every new table — no exceptions
- Supabase client: `lib/supabase/` — server.ts for Server Components, client.ts for Client Components
- Environment variables: never hardcode keys, always use `.env.local`
- `@supabase/supabase-js` version must stay at **^2.x** (SSR package not compatible with v3 yet)

## Code Style
- TypeScript strict mode — no `any` unless explicitly justified
- Shared types in `types/` directory
- Components in `components/` (UI atoms) and `app/` (page-level)
- Keep Server/Client boundary explicit — no accidental client bundle bloat

## Design System — "dark cinematic seinen"
- Background: `#0D1117`, Surface: `#1E2A3A`, Border: `#2D3F55`
- Accent: `#E67E22` (amber-orange), Hover: `#F39C12` (gold)
- Text: `#F0F4F8`, Muted: `#8899AA`
- Dark theme only (light theme out of scope)
- Aceternity UI effects only on: hero, title cards, poster glow — NOT on forms or navigation

## Workflow
See **AGENTS.md** for the development cycle (explore → plan → implement → verify → commit).
See **ARCHITECTURE.md** for full system overview.
See **TESTING.md** for test strategy and commands.