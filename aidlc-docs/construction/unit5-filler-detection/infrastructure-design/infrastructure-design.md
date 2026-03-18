# Infrastructure Design — Unit 5: Anime Filler Detection

---

## Database Migration

### Новый файл: `supabase/migrations/20260318000000_filler_detection.sql`

```sql
-- ============================================================
-- FILLER EPISODES — глобальный кэш (без user_id)
-- ============================================================
CREATE TABLE filler_episodes (
  tmdb_id                 INTEGER NOT NULL,
  absolute_episode_number INTEGER NOT NULL,
  PRIMARY KEY (tmdb_id, absolute_episode_number)
);

-- ============================================================
-- ANIME FILLER CACHE — статус обработки по тайтлу
-- ============================================================
CREATE TABLE anime_filler_cache (
  tmdb_id    INTEGER PRIMARY KEY,
  status     TEXT NOT NULL CHECK (status IN ('fetched', 'not_found', 'error')),
  source_url TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EPISODES — добавить поле is_filler
-- ============================================================
ALTER TABLE episodes
  ADD COLUMN is_filler BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_filler_episodes_tmdb_id ON filler_episodes (tmdb_id);
CREATE INDEX idx_episodes_is_filler      ON episodes (season_id, is_filler);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- filler_episodes: read-only для авторизованных, запись только Service Role
ALTER TABLE filler_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "filler_episodes_select" ON filler_episodes
  FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE/DELETE блокируется для всех кроме Service Role (bypass RLS)

-- anime_filler_cache: аналогично
ALTER TABLE anime_filler_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anime_filler_cache_select" ON anime_filler_cache
  FOR SELECT TO authenticated USING (true);
```

---

## Supabase Queries

### Чтение кэша
```typescript
// Проверить статус для аниме
supabase
  .from('anime_filler_cache')
  .select('status, source_url')
  .eq('tmdb_id', tmdbId)
  .maybeSingle()
```

### Чтение филлеров из кэша
```typescript
// Получить все филлерные эпизоды для тайтла
supabase
  .from('filler_episodes')
  .select('absolute_episode_number')
  .eq('tmdb_id', tmdbId)
```

### Запись филлеров (только Service Role client)
```typescript
// Batch insert в filler_episodes
supabaseAdmin
  .from('filler_episodes')
  .insert(fillerRows)       // [{ tmdb_id, absolute_episode_number }]
  .onConflict('tmdb_id,absolute_episode_number')

// Upsert статуса
supabaseAdmin
  .from('anime_filler_cache')
  .upsert({ tmdb_id: tmdbId, status, source_url, fetched_at: new Date().toISOString() })
```

### Обновление episodes (только Service Role client)
```typescript
// Пометить филлерные эпизоды
supabaseAdmin
  .from('episodes')
  .update({ is_filler: true })
  .in('id', fillerEpisodeIds)
```

---

## Внешние API

### AniList GraphQL API — TMDB title → MAL ID
- **Endpoint**: `https://graphql.anilist.co`
- **Метод**: POST, Content-Type: application/json
- **Auth**: не требуется (публичный API)
- **Rate limit**: 90 запросов/минуту

```graphql
query ($search: String) {
  Media(search: $search, type: ANIME, isAdult: false) {
    idMal
    title { romaji english }
  }
}
```

### Jikan API v4 — MAL ID → episodes с filler флагом
- **Endpoint**: `https://api.jikan.moe/v4/anime/{mal_id}/episodes?page={n}`
- **Метод**: GET, JSON
- **Auth**: не требуется
- **Rate limit**: 3 req/sec, 60 req/min
- **Пагинация**: до 100 эпизодов на страницу, `pagination.has_next_page`

```json
{
  "data": [
    { "mal_id": 1, "filler": false, "recap": false },
    { "mal_id": 26, "filler": true, "recap": false }
  ],
  "pagination": { "has_next_page": true, "last_visible_page": 3 }
}
```

Фильтр: `filler === true` → `absolute_episode_number = data[i].mal_id`

---

## Новые файлы

```
lib/
  supabase/
    service.ts              ← Supabase Service Role client
  filler/
    filler.service.ts       ← главная логика (fetchAndApplyFillers и др.)
    anilist.ts              ← AniList GraphQL: title → MAL ID
    jikan.ts                ← Jikan API v4: MAL ID → filler episode numbers
```

### `lib/supabase/service.ts`
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

export function createServiceClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
```
`persistSession: false` — Service Role не управляет сессиями пользователей.

---

## Изменения в существующих файлах

### `types/index.ts`
```typescript
// Episode — добавить поле
export interface Episode {
  // ...
  is_filler: boolean  // ← добавить
}
```

### `app/actions/tmdb.ts` — расширить `addMediaItem`
```typescript
// После createSeasonsAndEpisodes:
if ((type === 'tv' || type === 'anime') && result.item) {
  if (type === 'anime') {
    // fire-and-forget — не await
    void fetchAndApplyFillers(
      result.item.id,
      details.tmdb_id,
      details.title,
      details.original_title,
      details.seasons ?? []
    )
  }
}
```

---

## Переменные окружения

| Переменная | Где используется | Где взять |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/service.ts` | Supabase Dashboard → Project Settings → API → service_role key |

**Важно**: без `NEXT_PUBLIC_` префикса — доступна только на сервере.

Добавить в:
- `.env.local` (локально)
- Vercel: Settings → Environment Variables

---

## Переменные окружения — `.env.local.example` (обновить)
```
# Supabase Service Role (НИКОГДА не передавать на клиент)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```