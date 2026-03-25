# Roadmap — last-episode

## Completed

| Unit | Feature | Status |
|------|---------|--------|
| 1 | Foundation (Next.js + Supabase + Auth scaffold) | ✅ |
| 2 | Media Library (add via TMDB, collection grid) | ✅ |
| 3 | Title Detail (episode tracker, seasons) | ✅ |
| 4 | Statistics page (`/stats`) | ✅ |
| 5 | Filler detection | ✅ |
| 6 | Library redesign | ✅ |
| 7 | Social layer | ✅ |
| 8 | Auth UX polish | ✅ |
| 9 | Search debounce fix | ✅ |
| 10 | Auth form polish | ✅ |
| 11 | AI Recommendations (Groq streaming) | ✅ |

---

## Backlog

### Near-term
- Playwright integration tests (login, add to library, status change, stats, recommendations)
- Add Playwright to `package.json`, configure for Supabase test env

### Future ideas
- Import/export (CSV, JSON)
- Extended statistics (activity graphs, time-series)
- Playlists / custom lists
- Custom tags (beyond TMDB genres)
- Push notifications for new seasons
- Mobile app