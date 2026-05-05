# Рефакторинг last-episode — Vercel React Best Practices

Документ фиксирует результаты аудита кодовой базы и план рефакторинга на основе [vercel-react-best-practices](.claude/skills/vercel-react-best-practices/).

---

## Статус задач

| # | Юнит | Файлы | Статус |
|---|------|-------|--------|
| 1 | async-waterfalls-supabase | `lib/supabase/progress.ts` | ⏳ |
| 2 | async-waterfalls-tmdb | `lib/tmdb/tmdb.service.ts` | ⏳ |
| 3 | error-boundaries | `app/error.tsx`, `app/(app)/error.tsx`, `app/(auth)/error.tsx` | ⏳ |
| 4 | loading-states | `app/(app)/loading.tsx`, `app/(app)/library/loading.tsx`, `app/(app)/stats/loading.tsx`, `app/(app)/media/[id]/loading.tsx` | ⏳ |
| 5 | constants-and-dedup | `lib/constants.ts`, `components/library/MediaCard.tsx`, `components/profile/ProfileMediaCard.tsx` | ⏳ |
| 6 | stats-query-optimize | `app/(app)/stats/page.tsx` | ⏳ |
| 7 | code-quality-misc | `components/media/SeasonAccordion.tsx` | ⏳ |

---

## Найденные проблемы

### 🔴 КРИТИЧЕСКИЕ — Performance

#### 1. N+1 waterfall в `getSeasonsWithEpisodes`
**Файл**: `lib/supabase/progress.ts:55-66`

Последовательный цикл делает отдельный SQL-запрос для каждого сезона. Тайтл с 10 сезонами → 11 round-trips вместо 2.

```ts
// ❌ Сейчас — N+1 sequential
for (const season of seasons) {
  const { data: episodes } = await client.from('episodes').select('*').eq('season_id', season.id)
  result.push({ ...season, episodes })
}

// ✅ Нужно — Promise.all
const allEpisodes = await Promise.all(
  seasons.map(s => client.from('episodes').select('*').eq('season_id', s.id).order('episode_number', { ascending: true }))
)
return seasons.map((season, i) => ({
  ...season,
  episodes: allEpisodes[i].error ? [] : allEpisodes[i].data as Episode[],
}))
```

#### 2. N+1 waterfall в `getTVDetails`
**Файл**: `lib/tmdb/tmdb.service.ts:181-205`

Последовательный цикл делает отдельный HTTP fetch к TMDB для каждого сезона. Сериал с 5 сезонами → 6 sequential HTTP requests при добавлении в библиотеку.

```ts
// ❌ Сейчас — N+1 sequential
for (const s of r.seasons) {
  const epRes = await fetch(buildUrl(`/tv/${tmdbId}/season/${s.season_number}`), ...)
}

// ✅ Нужно — Promise.all
const regularSeasons = (r.seasons ?? []).filter(s => s.season_number !== 0)
const responses = await Promise.all(
  regularSeasons.map(s => fetch(buildUrl(`/tv/${tmdbId}/season/${s.season_number}`), { next: { revalidate: 0 } }))
)
```

---

### 🟡 ВЫСОКИЕ — Production Quality

#### 3. Нет error.tsx (Error Boundaries)

Ни в одном route segment нет `error.tsx`. При server-side ошибке — полный crash страницы, пользователь видит пустой экран.

Нужно создать:
- `app/error.tsx` — root fallback
- `app/(app)/error.tsx` — для authenticated routes
- `app/(auth)/error.tsx` — для auth routes

Требования:
- Обязательно `'use client'` (Next.js requirement)
- Кнопка "Попробовать снова" через `reset()`
- Дизайн в стиле проекта (тёмная тема, токены `bg-background`, `text-foreground`)

#### 4. Нет loading.tsx (Loading States)

Нет skeleton UI. При медленном соединении или первой загрузке страницы блокируют рендер без индикации.

Нужно создать:
- `app/(app)/loading.tsx` — generic spinner/skeleton
- `app/(app)/library/loading.tsx` — skeleton сетки карточек
- `app/(app)/stats/loading.tsx` — skeleton статистики
- `app/(app)/media/[id]/loading.tsx` — skeleton детальной страницы

Требования:
- Server Components (без `'use client'`)
- `animate-pulse` + `bg-muted/20` для skeleton blocks
- Повторяет реальную структуру страницы

---

### 🟢 СРЕДНИЕ — Code Quality

#### 5. Дублирование `STATUS_COLORS`

Одна и та же константа определена в двух файлах:
- `components/library/MediaCard.tsx:26-32`
- `components/profile/ProfileMediaCard.tsx:7-13`

Решение: переместить в `lib/constants.ts` и импортировать в оба компонента.

Дополнительно: `ProfileMediaCard` — 55-строчная read-only копия `MediaCard`. Можно добавить `readOnly?: boolean` проп и удалить дублирующий компонент.

#### 6. Stats page — последовательные зависимые запросы

**Файл**: `app/(app)/stats/page.tsx:26-50`

Два sequential запроса (seasons → episodes). Можно объединить в один Supabase-запрос с nested select:

```ts
// ✅ Один запрос вместо двух
const { data: seasons } = await supabase
  .from('seasons')
  .select('id, media_item_id, episodes(runtime_minutes, is_watched)')
  .in('media_item_id', tvAnimeIds)
```

#### 7. `withRetry` без задержки

**Файл**: `components/media/SeasonAccordion.tsx:34-40`

Retry происходит немедленно — при transient network error это создаёт burst нагрузку и бесполезно при рейт-лимитах.

```ts
// ✅ Нужно — добавить delay
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    await new Promise(resolve => setTimeout(resolve, 100))
    return await fn()
  }
}
```

---

## Дизайн-система (для loading/error компонентов)

| Token | Tailwind class | Hex |
|-------|---------------|-----|
| Background | `bg-background` | `#0D1117` |
| Surface | `bg-card` | `#1E2A3A` |
| Border | `border-border` | `#2D3F55` |
| Accent | `text-primary` | `#E67E22` |
| Text | `text-foreground` | `#F0F4F8` |
| Muted | `text-muted-foreground` | `#8899AA` |

---

## Quality Gate

Каждое изменение должно пройти:
```bash
npm run lint   # 0 ошибок
npm run build  # 0 ошибок
```
