## Goal
Close the Supabase security advisor warnings on `public.handle_new_user()` (lints 0028/0029) and `public.update_updated_at_column()` (lint 0011) with one migration.

## Approach
- New migration `supabase/migrations/20260924195142_harden_trigger_functions.sql` (version recorded by Supabase on `apply_migration`).
- `handle_new_user()` (SECURITY DEFINER, trigger on `auth.users`, from `20260323000000_profiles.sql`):
  - `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` — removes `/rest/v1/rpc/handle_new_user`.
    Triggers do not check EXECUTE for the role firing them, so signup (`supabase_auth_admin` inserting into `auth.users`) keeps creating profiles.
    `postgres` (owner) and `service_role` keep EXECUTE.
  - `ALTER FUNCTION ... SET search_path = ''` — body already references `public.profiles` fully qualified; `LOWER`/`TRIM` live in `pg_catalog`, which is always searched. No body change needed.
- `update_updated_at_column()` (from `20260317000000_initial_schema.sql`): `ALTER FUNCTION ... SET search_path = ''` — body only uses `NOW()` (`pg_catalog`).
- `ALTER FUNCTION` instead of `CREATE OR REPLACE` — keeps the bodies byte-identical to what is deployed, only config/ACL change.
- No app code changes: nothing calls `handle_new_user` via RPC.

## Checklist
- [x] Check live function definitions / ACLs on remote (read-only) — match local migration files
- [x] Write migration
- [x] Local test in throwaway `postgres:17` container: stub `auth` schema, `auth.users`, `auth.uid()`, `extensions` schema with uuid-ossp, Supabase roles; apply all migrations in version order (incl. remote-only `20260924194327_media_items_tmdb_kind` from branch `claude/keen-elion-375894`)
  - [x] insert into `auth.users` as a non-owner role without EXECUTE → profile row created
  - [x] `anon` / `authenticated` cannot call `handle_new_user()`
  - [x] UPDATE on `media_items` bumps `updated_at`
  - [x] `proconfig` shows empty `search_path` for both functions
- [x] `npm run build`, `npm run lint` — 0 errors
- [x] Apply to remote via `apply_migration` — **only after explicit user confirmation**
- [x] Rename local file to the version recorded in `supabase_migrations.schema_migrations`
- [x] Re-run security advisor — only leaked-password protection left

## Risks / open questions
- `20260924194327_media_items_tmdb_kind` is applied on remote but not merged into `main` — it lives on another branch and is not touched here. Our migration version sorts after it, so order stays consistent.
- Leaked-password protection (4th advisor warning) is an Auth dashboard setting — left to the user.
