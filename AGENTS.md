# AGENTS.md — AI Development Workflow

This file defines the development cycle for AI agents working on this project.
Follow this workflow for every non-trivial change.

---

## Development Cycle

### 1. EXPLORE (grounded)
Before writing any code:
- Read relevant files — never assume structure
- Understand existing patterns (auth, supabase client usage, component conventions)
- For DB changes: review existing migrations in `supabase/migrations/`
- Check `ARCHITECTURE.md` for system constraints

### 2. PLAN
**Always required for**: new features, DB schema changes, auth/server-client boundary changes, multi-file refactors.
**Can skip for**: single-file bug fixes, style tweaks, copy changes.

Create `plans/<feature-name>.md` with:
```
## Goal
One sentence.

## Approach
Bullet points — what changes, where, why.

## Checklist
- [ ] Step 1
- [ ] Step 2
- [ ] ...

## Risks / open questions
```
Update checkboxes during implementation (same interaction where step is completed).

**plan fast**: quick outline, skip details for obvious steps
**plan full**: detailed steps with file paths, for complex/risky changes

### 3. IMPLEMENT
- Follow the plan checklist step by step
- Respect server/client boundary on every new component
- Add Supabase migration if schema changes
- No magic strings — use constants or types

### 4. VERIFY
After implementation, always run:
```bash
npm run build     # must pass — 0 errors
npm run lint      # must pass
```
For DB changes: verify migration runs cleanly via `supabase db push` or local migration.
For auth-related changes: manually test login/logout flow.

**verify strict** (for UI/DB/auth changes): also check that existing flows still work end-to-end.

### 5. COMMIT
- Conventional commits: `feat(scope): description`, `fix(scope): description`, `refactor(scope): ...`
- Scope = feature area (e.g., `auth`, `library`, `recommendations`, `stats`, `db`)
- One logical change per commit

### 6. EVOLVE
- If architecture changed: update `ARCHITECTURE.md`
- If new major feature planned: update `ROADMAP.md`
- If plan was created: mark remaining open items or close the plan file
- If a non-obvious bug was fixed: run `/patch` to document it in `plans/patches/`
- Periodically: run `/evolve` to review accumulated patches and improve rules

---

## Hard Rules

| Rule | Applies to |
|------|-----------|
| No architecture changes without updating `ARCHITECTURE.md` | Any structural change |
| No new Supabase table without RLS policy | DB changes |
| No server/client boundary violation | All components |
| `npm run build` must pass before finishing any unit | All units |
| Playwright or integration test required for: login/logout, add to library, status change, stats | UI/DB/auth changes |
| `@supabase/supabase-js` stays at `^2.x` | Dependency updates |

---

## When a Plan is Required

```
Feature involves 3+ files?         → plan full
Touches DB schema?                  → plan full
Touches auth / middleware?          → plan full
New page or major component?        → plan fast
Bug fix in 1-2 files?               → no plan needed
Style / copy change?                → no plan needed
```

---

## Playwright Tests (when added)
Required test suite for critical flows:
1. Login / logout
2. Add title to library (via TMDB search)
3. Edit episode progress
4. Change watch status
5. Stats page loads correctly
6. Recommendation flow

Supabase test strategy: isolated test user + seeded local DB (see `TESTING.md`).