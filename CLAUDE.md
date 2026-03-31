/# last-episode — Project Rules

## Stack
- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui (tweakcn tokens), Framer Motion
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **External API**: TMDB API (search + metadata)
- **AI**: Groq API (streaming recommendations via `/api/recommendations`)
- **Deploy**: Vercel (frontend) + Supabase Cloud

## Key Commands
```bash
npm run dev       # dev server
npm run build     # production build — must pass before every commit
npm run lint      # ESLint check — must pass before every commit
```

## Development Workflow

### Cycle: EXPLORE → BRAINSTORM → PLAN → IMPLEMENT → VERIFY → COMMIT → EVOLVE

**EXPLORE** — Always read relevant files before writing anything. Never assume structure or patterns. For DB changes: review existing migrations in `supabase/migrations/`.

**BRAINSTORM** — For any change touching 3+ files, new features, or architectural decisions: present 2-3 concrete approaches with trade-offs and get user confirmation before planning. Never jump straight to implementation on non-trivial tasks.

**PLAN** — Required when: 3+ files touched, DB schema change, auth/middleware change, new page, new API route. Create `plans/<feature-name>.md`:
```
## Goal
One sentence.

## Approach
Bullet points — what changes, where, why.

## Checklist
- [ ] Step 1
- [ ] ...

## Risks / open questions
```
- `plan fast` — quick outline, skip details for obvious steps
- `plan full` — detailed steps with file paths, for complex/risky changes

**IMPLEMENT** — Follow the plan checklist step by step. Respect server/client boundary on every new component. For business logic and utilities: prefer test-first when applicable (write failing test → implement → refactor).

**VERIFY** — Before claiming done, run and read **full output**:
```bash
npm run build   # 0 errors required
npm run lint    # 0 errors required
```
For DB changes: verify migration runs cleanly. For auth changes: manually test login/logout. Never assume success from a partial read.

**COMMIT** — Conventional commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `chore(scope):`
Scope = feature area: `auth`, `library`, `recommendations`, `stats`, `db`, `ui`, `nav`, etc.

**EVOLVE** — After any non-obvious bug fix: run `/patch`. Periodically: run `/evolve` to promote patterns into rules. After structural changes: update `ARCHITECTURE.md`.

---

### Tools & Skills Available

**MCP servers** (configured in `.mcp.json`):
- **Context7** — add `use context7` to any prompt when working with Next.js, Supabase, shadcn/ui, Tailwind APIs. Fetches current, version-accurate docs — prevents hallucinated or stale API usage.
- **Sequential Thinking** — invoke for architectural decisions, DB schema design, complex multi-step planning. Allows structured reasoning with revision and backtracking.
- **Playwright CLI** — browser automation for visual testing and interaction verification.
- **shadcn** — component introspection and registry access.

**Installed skills** (invoked as slash commands or referenced in prompts):
- **vercel-react-best-practices** — 67 prioritised Next.js/React performance rules across 8 categories (waterfalls, bundle size, SSR caching, re-renders). Reference rules by prefix (e.g. `async-parallel`, `bundle-direct-imports`) during implementation and code review.
- **planning-with-files** — filesystem-backed task planning for long sessions. Creates `task_plan.md` / `findings.md` / `progress.md` in the project root. Invoke at the start of any session spanning many files or multi-hour work.

---

## Context & Memory

### Within a session
- **Compact proactively** — run `/compact` when context approaches ~70%; don't wait for forced compaction which loses nuance
- **Checkpoint before risky ops** — destructive file changes, DB migrations, auth refactors
- **Use `planning-with-files` for long sessions** — creates `task_plan.md` / `findings.md` / `progress.md` that survive context resets; re-read plan before major decisions
- **MCP discipline** — too many active tools erode the context window; disable servers you're not using in a given session

### Between sessions
- Non-obvious constraints, architectural decisions, and preferences are auto-saved to project memory (`memory/` directory) and loaded on session start
- Explicitly ask to save something: "запомни: ..." — saves to persistent memory
- `/patch` after any non-obvious bug fix — saved lesson beats re-learning
- `/evolve` periodically to crystallise patch lessons into Hard Rules
- Key principle: **context window = RAM (volatile), filesystem = disk (persistent)** — offload to files early and often

---

## Architecture Constraints

### Supabase
- All DB changes via migrations (`supabase/migrations/`) — never through Supabase UI
- RLS must be enabled on **every new table** — no exceptions
- Auth exclusively via `@supabase/ssr` — never roll custom auth
- `@supabase/supabase-js` exact pin at **`2.46.2`** (no `^`) — caret range allowed a breaking minor to slip in; v3 incompatible with `@supabase/ssr`
- Client: `lib/supabase/server.ts` in Server Components, `lib/supabase/client.ts` in Client Components
- RLS SELECT on relational tables involving two users: must cover **both sides** — `user_id = auth.uid() OR friend_id = auth.uid()`
- Auth in server-side code: use `getServerUser()` from `lib/supabase/server.ts` — **never** `supabase.auth.getUser()` directly. `getServerUser` is wrapped in `React.cache()` and deduplicates the auth call across layout + pages + server actions in a single render tree (see `plans/patches/react-cache-auth-deduplication.md`). Exception: API Route Handlers (`/api/*`) — use direct client there.

### Next.js
- Server Components by default; `'use client'` only when needed (interactivity, hooks)
- No accidental client bundle bloat — keep server/client boundary explicit and intentional

### Library Version Locks (do NOT upgrade without explicit testing on a dedicated branch)

| Package | Locked version | Why |
|---------|---------------|-----|
| `framer-motion` | `11.14.4` | 11.15–11.18.x have broken ES builds — Turbopack fails with `Module not found` |
| `motion-dom` | `11.14.3` | Same ES build issue as framer-motion |
| `@supabase/supabase-js` | `2.46.2` | Breaking minor via caret; v3 incompatible with SSR |

See `plans/patches/` for details.

### Code Quality
- TypeScript strict mode — no `any` without an explicit justification comment
- Shared types in `types/`
- Never use regex to parse LLM JSON output — use bracket-counting or try/catch (see `plans/patches/llm-streaming-json-greedy-regex.md`)
- Never nest interactive elements inside shadcn trigger components — `AccordionTrigger`, `SelectTrigger`, etc. render `<button>` internally; use headless Radix Primitives instead (see `plans/patches/shadcn-accordion-trigger-button-nesting.md`)
- No hardcoded secrets — always `.env.local`

---

## Testing

**Minimum quality gate (required before every commit):**
```bash
npm run build   # 0 errors
npm run lint    # 0 errors
```

**Playwright E2E (planned — add incrementally as features stabilize):**

| Test | File | Priority |
|------|------|----------|
| Login / logout | `tests/auth.spec.ts` | P0 |
| Add title to library (TMDB search) | `tests/library.spec.ts` | P0 |
| Mark episode watched | `tests/episode.spec.ts` | P0 |
| Change watch status | `tests/library.spec.ts` | P0 |
| Stats page correct totals | `tests/stats.spec.ts` | P1 |
| Recommendation stream renders | `tests/recommendations.spec.ts` | P1 |

**Playwright patterns for this project:**
- Use `storageState` for auth session reuse across tests
- Intercept TMDB calls with `page.route()` fixture data (avoid flaky network)
- Seed with `supabase db seed` before test run
- Prefer `data-testid` over CSS selectors for stability
- CI: `retries: 2`, `trace: 'on-first-retry'`, screenshots on failure

**Manual checklist (until Playwright):**
- [ ] Login / logout works
- [ ] Can add title from TMDB search
- [ ] Episode marking persists on reload
- [ ] Status change reflects in library grid
- [ ] Stats page shows correct data

---

## Design System — "dark cinematic seinen"

| Token | Value | Use |
|-------|-------|-----|
| Background | `#0D1117` | Page bg |
| Surface | `#1E2A3A` | Cards, panels |
| Border | `#2D3F55` | Dividers, outlines |
| Accent | `#E67E22` | Primary actions, highlights |
| Hover | `#F39C12` | Hover state for accent elements |
| Text | `#F0F4F8` | Body text |
| Muted | `#8899AA` | Secondary text, placeholders |

- Dark theme only (light theme out of scope)
- Aceternity UI effects: **only** on hero, title cards, poster glow — never on forms or navigation

---

## Hard Rules

1. `npm run build` must pass before any commit — non-negotiable
2. RLS on every new Supabase table — non-negotiable
3. Never modify auth/middleware without a written plan
4. Never upgrade `framer-motion` above `11.14.4`
5. Never bump `@supabase/supabase-js` without a dedicated branch + full build test
6. Brainstorm (2-3 approaches) before implementing anything touching 3+ files
7. Verify with actual command output before claiming a task is done
8. Document every non-obvious bug with `/patch` — don't let lessons fade
9. Never use regex for parsing LLM-generated JSON
10. Server Components by default — justify every `'use client'`
11. No architecture changes without updating `ARCHITECTURE.md`
12. In server-side code use `getServerUser()` for auth — never `supabase.auth.getUser()` directly (except API routes)

---

## When a Plan is Required

```
Feature touches 3+ files?           → plan full
Touches DB schema?                  → plan full
Touches auth / middleware?          → plan full
New page or major component?        → plan fast
Bug fix in 1-2 files?               → no plan needed
Style / copy change?                → no plan needed
```