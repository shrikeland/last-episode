# Episode Progress on MediaCard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показывать на карточке тайтла прогресс просмотра серий: счётчик «просмотрено/всего эп.» и тонкий прогресс-бар снизу карточки.

**Architecture:** На уровне `library/page.tsx` делаем два агрегирующих запроса к `seasons` и `episodes`, собираем `Record<string, EpisodeProgress>`, пробрасываем вниз по дереву компонентов. В `MediaCard` рендерим счётчик абсолютно внизу-справа и 2px прогресс-бар у нижнего края. Показываем только когда `total > 0`.

**Tech Stack:** Next.js App Router, Supabase (PostgREST), TypeScript, React

---

## File Map

| Файл | Действие |
|------|----------|
| `types/index.ts` | Добавить интерфейс `EpisodeProgress` |
| `lib/supabase/media.ts` | Добавить `getEpisodeProgressMap()` |
| `app/(app)/library/page.tsx` | Вызвать функцию, передать `progressMap` |
| `components/library/LibrarySections.tsx` | Добавить prop, прокинуть в MediaGrid и MediaSection |
| `components/library/MediaGrid.tsx` | Добавить prop, прокинуть в MediaCard |
| `components/library/MediaSection.tsx` | Добавить prop, прокинуть в MediaRow |
| `components/library/MediaRow.tsx` | Добавить prop, прокинуть в MediaCard |
| `components/library/MediaCard.tsx` | Рендерить счётчик + прогресс-бар |

---

### Task 1: Добавить тип EpisodeProgress

**Files:**
- Modify: `types/index.ts` (после `MediaItem`, до `Season`)

- [ ] **Шаг 1: Добавить интерфейс**

Открыть `types/index.ts`. После строки `export interface MediaItem {` блока (строка ~49) и перед `export interface Season {` вставить:

```ts
export interface EpisodeProgress {
  watched: number
  total: number
}
```

- [ ] **Шаг 2: Проверить компиляцию**

```bash
cd /Users/hornysennin/Projects/last-episode && npx tsc --noEmit 2>&1 | head -20
```

Ожидается: нет новых ошибок.

- [ ] **Шаг 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(library): add EpisodeProgress type"
```

---

### Task 2: Добавить getEpisodeProgressMap в lib/supabase/media.ts

**Files:**
- Modify: `lib/supabase/media.ts`

- [ ] **Шаг 1: Добавить импорт типа**

В начало `lib/supabase/media.ts` в import из `'@/types'` добавить `EpisodeProgress`:

```ts
import type {
  CreateMediaItemOptions,
  Database,
  EpisodeProgress,
  MediaItem,
  MediaFilters,
  SortOptions,
  TmdbDetails,
} from '@/types'
```

- [ ] **Шаг 2: Добавить функцию в конец файла**

Добавить после `deleteMediaItem`:

```ts
export async function getEpisodeProgressMap(
  client: Client,
  itemIds: string[]
): Promise<Record<string, EpisodeProgress>> {
  if (itemIds.length === 0) return {}

  const { data: seasons } = await client
    .from('seasons')
    .select('id, media_item_id, episode_count')
    .in('media_item_id', itemIds)

  if (!seasons || seasons.length === 0) return {}

  const typedSeasons = seasons as { id: string; media_item_id: string; episode_count: number }[]
  const seasonIds = typedSeasons.map((s) => s.id)

  const totals: Record<string, number> = {}
  const seasonToItem: Record<string, string> = {}
  for (const s of typedSeasons) {
    totals[s.media_item_id] = (totals[s.media_item_id] ?? 0) + s.episode_count
    seasonToItem[s.id] = s.media_item_id
  }

  const { data: watchedEps } = await client
    .from('episodes')
    .select('season_id')
    .in('season_id', seasonIds)
    .eq('is_watched', true)

  const watchedCounts: Record<string, number> = {}
  for (const ep of ((watchedEps ?? []) as { season_id: string }[])) {
    const itemId = seasonToItem[ep.season_id]
    if (itemId) {
      watchedCounts[itemId] = (watchedCounts[itemId] ?? 0) + 1
    }
  }

  const result: Record<string, EpisodeProgress> = {}
  for (const itemId of itemIds) {
    const total = totals[itemId] ?? 0
    if (total > 0) {
      result[itemId] = { watched: watchedCounts[itemId] ?? 0, total }
    }
  }
  return result
}
```

- [ ] **Шаг 3: Проверить компиляцию**

```bash
cd /Users/hornysennin/Projects/last-episode && npx tsc --noEmit 2>&1 | head -20
```

Ожидается: нет ошибок.

- [ ] **Шаг 4: Commit**

```bash
git add lib/supabase/media.ts
git commit -m "feat(library): add getEpisodeProgressMap query"
```

---

### Task 3: Вызвать getEpisodeProgressMap в library/page.tsx

**Files:**
- Modify: `app/(app)/library/page.tsx`

- [ ] **Шаг 1: Добавить импорт функции**

В `app/(app)/library/page.tsx` расширить импорт из `@/lib/supabase/media`:

```ts
import { getMediaItems, getEpisodeProgressMap } from '@/lib/supabase/media'
```

- [ ] **Шаг 2: Вызвать после getMediaItems и передать в LibrarySections**

Заменить блок с `const items = ...` и `return (...)` на:

```ts
  const items = await getMediaItems(supabase, user.id, filters, sort)

  const nonMovieIds = items.filter((i) => i.type !== 'movie').map((i) => i.id)
  const progressMap = await getEpisodeProgressMap(supabase, nonMovieIds)

  const hasFilters = !!(params.search || (params.status && params.status !== 'all'))

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">Библиотека</h1>
        </div>
        <p className="text-sm text-muted-foreground">{items.length} тайтлов в коллекции</p>
      </div>
      <FilterBar currentFilters={params} />
      <LibrarySections items={items} hasFilters={hasFilters} progressMap={progressMap} />
    </div>
  )
```

- [ ] **Шаг 3: Проверить компиляцию**

```bash
cd /Users/hornysennin/Projects/last-episode && npx tsc --noEmit 2>&1 | head -20
```

Ожидается: ошибка о том, что `LibrarySections` не принимает `progressMap` — это нормально, исправим в Task 4.

- [ ] **Шаг 4: Commit после Task 4** (объединить с ним)

---

### Task 4: Прокинуть progressMap через LibrarySections → MediaGrid + MediaSection

**Files:**
- Modify: `components/library/LibrarySections.tsx`
- Modify: `components/library/MediaGrid.tsx`
- Modify: `components/library/MediaSection.tsx`

#### LibrarySections.tsx

- [ ] **Шаг 1: Обновить импорты и интерфейс**

```ts
import { MediaSection } from './MediaSection'
import { MediaGrid } from './MediaGrid'
import { EmptyState } from './EmptyState'
import type { MediaItem, MediaType, EpisodeProgress } from '@/types'

const TYPE_ORDER: MediaType[] = ['movie', 'animation', 'tv', 'anime']

interface LibrarySectionsProps {
  items: MediaItem[]
  hasFilters: boolean
  progressMap: Record<string, EpisodeProgress>
}
```

- [ ] **Шаг 2: Обновить компонент**

```ts
export function LibrarySections({ items, hasFilters, progressMap }: LibrarySectionsProps) {
  if (hasFilters) {
    return <MediaGrid items={items} hasFilters={hasFilters} progressMap={progressMap} />
  }

  if (items.length === 0) {
    return <EmptyState hasFilters={false} />
  }

  const grouped = items.reduce<Record<MediaType, MediaItem[]>>(
    (acc, item) => { acc[item.type].push(item); return acc },
    { movie: [], animation: [], tv: [], anime: [] }
  )

  return (
    <div className="space-y-10">
      {TYPE_ORDER.map((type) => (
        <MediaSection key={type} type={type} items={grouped[type]} progressMap={progressMap} />
      ))}
    </div>
  )
}
```

#### MediaGrid.tsx

- [ ] **Шаг 3: Обновить MediaGrid**

```ts
import { MediaCard } from './MediaCard'
import { EmptyState } from './EmptyState'
import type { MediaItem, EpisodeProgress } from '@/types'

interface MediaGridProps {
  items: MediaItem[]
  hasFilters: boolean
  progressMap: Record<string, EpisodeProgress>
}

export function MediaGrid({ items, hasFilters, progressMap }: MediaGridProps) {
  if (items.length === 0) {
    return <EmptyState hasFilters={hasFilters} />
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <MediaCard key={item.id} item={item} index={i} progress={progressMap[item.id]} />
      ))}
    </div>
  )
}
```

#### MediaSection.tsx

- [ ] **Шаг 4: Обновить MediaSection**

Добавить в импорты `EpisodeProgress`:
```ts
import type { MediaItem, MediaType, EpisodeProgress } from '@/types'
```

Обновить интерфейс:
```ts
interface MediaSectionProps {
  type: MediaType
  items: MediaItem[]
  progressMap: Record<string, EpisodeProgress>
}
```

Обновить компонент:
```ts
export function MediaSection({ type, items, progressMap }: MediaSectionProps) {
  const { accent } = useTheme()
  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="flex items-center">{TYPE_SVG[type]?.(accent)}</span>
        <h2
          className="text-xs font-bold tracking-[0.12em] uppercase"
          style={{ color: 'hsl(210 100% 93%)' }}
        >
          {MEDIA_TYPE_LABELS[type]}
        </h2>
        <span
          className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-full border"
          style={{
            background: 'hsl(213 50% 8%)',
            borderColor: 'hsl(213 44% 16%)',
            color: 'hsl(210 14% 50%)',
          }}
        >
          {items.length}
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: 'linear-gradient(90deg, hsl(213 44% 20%) 0%, transparent 100%)' }}
        />
      </div>
      <MediaRow items={items} progressMap={progressMap} />
    </div>
  )
}
```

- [ ] **Шаг 5: Проверить компиляцию**

```bash
cd /Users/hornysennin/Projects/last-episode && npx tsc --noEmit 2>&1 | head -20
```

Ожидается: ошибка о том, что `MediaRow` не принимает `progressMap` — исправим в Task 5.

---

### Task 5: Прокинуть progressMap через MediaRow

**Files:**
- Modify: `components/library/MediaRow.tsx`

- [ ] **Шаг 1: Обновить импорты и интерфейс**

```ts
'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MediaCard } from './MediaCard'
import type { MediaItem, EpisodeProgress } from '@/types'

interface MediaRowProps {
  items: MediaItem[]
  progressMap: Record<string, EpisodeProgress>
}
```

- [ ] **Шаг 2: Обновить компонент — принять prop и прокинуть в MediaCard**

Изменить сигнатуру:
```ts
export function MediaRow({ items, progressMap }: MediaRowProps) {
```

Изменить рендер карточки (внутри `.map()`):
```tsx
{items.map((item, i) => (
  <div key={item.id} className="flex-shrink-0 w-[140px] sm:w-[152px]">
    <MediaCard item={item} index={i} progress={progressMap[item.id]} />
  </div>
))}
```

- [ ] **Шаг 3: Проверить компиляцию**

```bash
cd /Users/hornysennin/Projects/last-episode && npx tsc --noEmit 2>&1 | head -20
```

Ожидается: ошибка о том, что `MediaCard` не принимает `progress` — исправим в Task 6.

---

### Task 6: Рендерить прогресс в MediaCard

**Files:**
- Modify: `components/library/MediaCard.tsx`

- [ ] **Шаг 1: Обновить импорты и интерфейс**

Добавить `EpisodeProgress` в импорт:
```ts
import type { MediaItem, EpisodeProgress } from '@/types'

interface MediaCardProps {
  item: MediaItem
  index?: number
  progress?: EpisodeProgress
}
```

- [ ] **Шаг 2: Добавить переменные для прогресса**

После строки `const statusColor = STATUS_HEX[item.status] ?? '#8899AA'` добавить:

```ts
  const showProgress = (progress?.total ?? 0) > 0
  const progressPct = showProgress
    ? Math.round(((progress!.watched) / progress!.total) * 100)
    : 0
```

- [ ] **Шаг 3: Обновить секцию «Year — pinned bottom-left» и добавить бар**

Найти блок с комментарием `{/* Year — pinned bottom-left */}` (строки ~295-311) и заменить его целиком:

```tsx
      {/* Bottom info row: year (left) + episode count (right) */}
      <div
        style={{
          position: 'absolute',
          bottom: showProgress ? 10 : 8,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 6,
        }}
      >
        {item.release_year != null ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'hsl(210 14% 45%)',
              letterSpacing: '0.04em',
            }}
          >
            {item.release_year}
          </span>
        ) : <span />}

        {showProgress && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: 'hsl(210 14% 45%)',
              letterSpacing: '0.03em',
            }}
          >
            {progress!.watched}/{progress!.total} эп.
          </span>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'hsl(213 44% 16%)',
            zIndex: 6,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: statusColor,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}
```

- [ ] **Шаг 4: Обновить сигнатуру компонента**

```ts
export function MediaCard({ item, index = 0, progress }: MediaCardProps) {
```

- [ ] **Шаг 5: Проверить компиляцию**

```bash
cd /Users/hornysennin/Projects/last-episode && npx tsc --noEmit 2>&1 | head -30
```

Ожидается: 0 ошибок.

- [ ] **Шаг 6: Commit всего**

```bash
git add \
  app/\(app\)/library/page.tsx \
  components/library/LibrarySections.tsx \
  components/library/MediaGrid.tsx \
  components/library/MediaSection.tsx \
  components/library/MediaRow.tsx \
  components/library/MediaCard.tsx
git commit -m "feat(library): show episode progress bar and counter on MediaCard"
```

---

### Task 7: Финальная проверка

- [ ] **Шаг 1: Build**

```bash
cd /Users/hornysennin/Projects/last-episode && npm run build 2>&1 | tail -20
```

Ожидается: `✓ Compiled successfully`, 0 errors.

- [ ] **Шаг 2: Lint**

```bash
cd /Users/hornysennin/Projects/last-episode && npm run lint 2>&1 | tail -10
```

Ожидается: `✔ No ESLint warnings or errors`.

- [ ] **Шаг 3: Мануальная проверка**

1. Запустить `npm run dev`
2. Открыть библиотеку — убедиться что карточки аниме/сериалов с эпизодами показывают `X/Y эп.` и прогресс-бар внизу
3. Карточки фильмов и тайтлов без эпизодов в БД — прогресс не отображается
4. Прогресс-бар корректен при 0%, ~50%, 100% просмотре