## Goal
Faster feedback while searching and while waiting for recommendations: fewer round trips, cached TMDB search, a visible placeholder for the cards being prepared.

## Approach
- **TMDB search cache:** `search()` caches for 1 h in the Next data cache (`tmdbFetch(url, HOUR)`). The query is normalized (trimmed, whitespace collapsed, lowercased) so the URL — the cache key — repeats. Recommendation enrichment uses the same `search()` and benefits too.
- **Search: one server action per query.** `searchTitles(query)` returns results plus in-library keys. Before, the client called `searchTmdb` and then `getLibraryTitleKeys`: two POSTs in a row, each through the proxy. Server actions run one at a time, so this also halves the queue while typing.
- **Search: at least 2 characters** before querying. One letter makes TMDB return noise.
- **Search: query in the URL (`?q=`).** It is written with `history.replaceState`, which Next 16 syncs with the router without a server round trip. Back from a title page restores the results, and the page passes `searchParams.q` to `SearchInput` as the initial query.
- **Recommendations route:**
  - The taste profile, library and recent history load in parallel before the Groq call. Before, that was three sequential round trips.
  - Each card carries `inLibrary`, computed from the library the route already loaded. The client drops its extra `getLibraryTitleKeys` call after the cards arrive.
- **Recommendations UI:** while the list is being prepared, show 5 card skeletons in the same grid instead of only the dots line.
- **Dropped:**
  - Streaming cards one by one: `selectDiverseTop5` needs the full set to pick 5 diverse titles, and a retry pass may replace them.
  - A client-side search `Map` cache: in-library flags go stale after adding a title from search. The 1 h server cache covers repeat queries.

## Checklist
- [x] TMDB search cache + normalized query
- [x] `searchTitles` action, `SearchInput` uses it, 2-char minimum, `?q=`
- [x] Recommendations route: parallel loads, `inLibrary` on cards
- [x] Recommendations client: no `getLibraryTitleKeys`, card skeletons
- [x] build + lint after every commit
- [ ] `/search` and `/recommendations` need a signed-in session. CI smoke covers TC-SEARCH-001/004 and TC-REC-001. Check `?q=` + Back and a full generation by hand on the preview

## Risks / open questions
- A cached search can be up to 1 h stale (a just-released title may not show up yet). Acceptable for a tracker.
- `history.replaceState` in Next 16 integrates with `useSearchParams`; the search page does not read `useSearchParams` on the client, so nothing re-renders.
