# Episode Progress on MediaCard — Design Spec

## Goal

Показывать на карточке тайтла прогресс просмотра серий: счётчик «просмотрено/всего эп.» и тонкий прогресс-бар снизу карточки. Только для тайтлов с эпизодами в БД (total > 0).

## Подход

Вариант A: два отдельных агрегирующих запроса к БД на уровне страницы, результат передаётся вниз по дереву как `Record<string, EpisodeProgress>`.

## Компонентное дерево (prop chain)

```
LibraryPage (server)
  └── LibrarySections (server)   ← получает progressMap
        ├── MediaGrid (server)   ← получает progressMap
        │     └── MediaCard (client)
        └── MediaSection (client) ← получает progressMap
              └── MediaRow (client) ← получает progressMap
                    └── MediaCard (client)
```

## Данные

**Тип `EpisodeProgress`** (`types/index.ts`):
```ts
export interface EpisodeProgress {
  watched: number
  total: number
}
```

**Функция `getEpisodeProgressMap`** (`lib/supabase/media.ts`):
- Принимает `client`, `itemIds: string[]`
- Запрос 1: `seasons` → `select('id, media_item_id, episode_count')`, `in('media_item_id', itemIds)`
  - Агрегировать `episode_count` → `totals[media_item_id]`
  - Строить `seasonToItem[season_id] = media_item_id`
- Запрос 2: `episodes` → `select('season_id')`, `in('season_id', seasonIds)`, `eq('is_watched', true)`
  - Агрегировать → `watchedCounts[media_item_id]`
- Возвращает `Record<string, EpisodeProgress>` только для item'ов с `total > 0`

**Вызов в `library/page.tsx`**:
- Фильтровать только не-movie item'ы (у фильмов нет серий)
- Вызвать `getEpisodeProgressMap(supabase, nonMovieIds)`
- Передать `progressMap` в `LibrarySections`

## UI в MediaCard

**Где показывать:** только когда `progress?.total > 0`

**Счётчик серий:** рядом с годом (абсолютная позиция bottom-left), справа от него — `"${watched}/${total} эп."`, font-size 10, color muted

**Прогресс-бар:**
- Абсолютный, `bottom: 0`, `left: 0`, `right: 0`, `height: 2px`
- Track: `hsl(213 44% 16%)`
- Fill: ширина = `${(watched / total) * 100}%`, цвет = `statusColor`
- Без border-radius на fill, чтобы выглядел как скруббер

## Решения

- `Record<>` вместо `Map<>` — сериализуется через server→client границ
- Фильтрация `movie`-типов на уровне page (не передаём ненужные ID в запрос)
- `total > 0` guard в MediaCard (не ломает карточки без сезонов)
- Год и счётчик на одном `bottom: 8` ряду — год слева, счётчик справа через `right: 12`

## Файлы, которые меняются

1. `types/index.ts` — добавить `EpisodeProgress`
2. `lib/supabase/media.ts` — добавить `getEpisodeProgressMap`
3. `app/(app)/library/page.tsx` — вызвать, передать в LibrarySections
4. `components/library/LibrarySections.tsx` — принять, прокинуть
5. `components/library/MediaGrid.tsx` — принять, прокинуть
6. `components/library/MediaSection.tsx` — принять, прокинуть
7. `components/library/MediaRow.tsx` — принять, прокинуть
8. `components/library/MediaCard.tsx` — отрендерить счётчик + бар

## Критерии готовности

- [ ] `npm run build` — 0 ошибок
- [ ] `npm run lint` — 0 ошибок
- [ ] Карточка с эпизодами: виден счётчик и бар
- [ ] Карточка без эпизодов / фильм: ни счётчик, ни бар не отображаются
- [ ] Прогресс-бар корректно отображает 0%, 50%, 100%