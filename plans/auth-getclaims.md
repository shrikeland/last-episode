## Goal
Stop calling Supabase Auth over the network on every request: verify the session JWT locally with `auth.getClaims()`.

## Approach
- **Why it works here.**
  - The project publishes an ES256 key at `/auth/v1/.well-known/jwks.json`.
  - `getClaims()` checks the signature and `exp` locally with WebCrypto.
  - The JWKS is cached module-wide for 10 minutes (`GLOBAL_JWKS` in auth-js), so a warm function does no network at all.
  - For an HS256 token or a missing key it falls back to `getUser()`, which is today's behaviour.
- **Deps (done in the previous commit):** `supabase-js` 2.46.2 → 2.117.2, `@supabase/ssr` 0.5.2 → 0.12.7. The schema type is now generated (`types/database.ts`).
- **`proxy.ts`:**
  - `getUser()` → `getClaims()`. It still runs `getSession()` first, which refreshes an expired access token and writes cookies through `setAll`, so session refresh stays in the proxy.
  - `setAll` also copies the cache headers that `@supabase/ssr` ≥0.10 passes, so a CDN never caches a response that sets auth cookies.
- **`getServerUser()` (`lib/supabase/server.ts`):**
  - returns `{ id, email }` built from the claims (`sub`, `email`). The app uses only these two fields: `user.id` in 42 places and `user.email` once, in the layout;
  - stays wrapped in `React.cache`;
  - the layout guard is unchanged: `redirect('/login')` when it returns null.
- **API routes** (`/api/recommendations/generate`, `/api/recommendations/profile`): `getUser()` → `getClaims()`, same direct-client pattern as before.

## Checklist
- [x] Bump deps, generated schema types, build + lint
- [x] proxy + getServerUser + API routes on getClaims
- [x] build + lint
- [x] Local `next start`: signed-out `/library`, `/media/x` and `/api/recommendations/profile` redirect to `/login`. A forged cookie with the project's real `kid` and a bad ES256 signature is also redirected
- [x] Cookie format: ssr 0.5.2 and 0.12.7 both write and read `base64-` chunked cookies
- [ ] Preview: sign in, navigate, sign out, recommendations generate; the `/login` redirect when signed out

## Risks / open questions
- `getClaims()` does not see a server-side logout or session revocation until the access token expires (1 h by default); `getUser()` saw it at once. Supabase recommends this trade-off for request-path auth checks. Sign-out in this app clears the cookies, so the user's own logout takes effect immediately.
- Cookie format: `@supabase/ssr` 0.12 reads the base64 cookies written by 0.5, so existing sessions keep working. This is still worth confirming on the preview with a session created before the deploy.
- If signing is still HS256, `getClaims` falls back to `getUser()`: no gain and no regression.
