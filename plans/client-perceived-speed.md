## Goal
Pages paint sooner and feel faster: less JS on every page, no render-blocking font, images straight from TMDB, no hidden cards, no layout shift or theme flash.

## Approach
- **Font:** replace the `@import` of Google Fonts in `globals.css` with `next/font/google` **Onest** (subsets `latin` and `cyrillic`).
  - The font becomes self-hosted and preloaded, with no layout shift.
  - DM Sans had no Cyrillic, so Russian text fell back to the system font. The user chose Onest.
  - Tailwind's `fontFamily.sans` points at the new CSS variable.
- **Images:** a custom `next/image` loader (`lib/tmdb/image-loader.ts`) maps the requested width to TMDB's own poster sizes. This drops the Vercel optimizer: one fewer hop, and no Hobby quota.
  - Only poster sizes are rewritten (w92…w780), and never above the size stored in the src.
  - Cast photos (`w185`, profile images have their own size set) and local `/public` icons pass through untouched.
  - `priority` goes on the first 6 cards of the first library section or grid.
  - `sizes` gets fixed in `ProfileMediaCard`, `RecommendationCard`, `MediaCard` (mobile) and `ModeSwitcher`.
- **Bundle:**
  - Sign-out moves to a server action (`app/actions/auth.ts`). `Navbar` no longer imports `@supabase/supabase-js` (~36 KB gzip on every app page).
  - `TrueFocus` (navbar logo) uses a CSS transition instead of `motion.div`.
  - `Dock` uses `LazyMotion` + `m` with `domAnimation`. It needs no layout or drag features.
- **Card entrance:** cap the stagger delay at 12 cards. Before, card 40 stayed invisible for about 1.7 s.
- **FilterBar** (`ssr: false`): a skeleton of the same controls and sizes while the chunk loads, so the grid doesn't jump.
- **Sasuke theme flash:**
  - an inline script in `<head>` sets `data-sasuke` before first paint;
  - `ThemeProvider` no longer writes `false` on its first effect run, which would flip the attribute back.
- **Skeletons:** `loading.tsx` for `/search`, `/recommendations` and `profile/[username]/media/[id]`.
- **Dropped: `useOptimistic`.** After stage 1, episode marks and ratings no longer return a re-rendered page, so a server reply can't overwrite in-flight ticks any more.

## Checklist
- [ ] Font → Onest via next/font
- [ ] TMDB image loader + priority + sizes
- [ ] Sign-out server action
- [ ] TrueFocus CSS, Dock LazyMotion
- [ ] Card stagger cap
- [ ] FilterBar skeleton
- [ ] Theme flash fix
- [ ] loading.tsx for search / recommendations / friend's title
- [ ] build + lint after every commit; check visually in the browser (library, title, login)

## Risks / open questions
- With `loader: 'custom'`, every `next/image` goes through the loader. Anything that isn't a TMDB poster is served as-is: the two 24 KB mode icons now load at full size.
- TMDB serves JPEG, not WebP/AVIF. Picking the nearest TMDB size keeps the weight comparable, and there is no quota anymore.
- Onest changes the look of every text on the site. The user chose it.
