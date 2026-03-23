# Domain Entities — Unit 6: Library Redesign

## Новые сущности

Unit 6 не вводит новых таблиц БД и новых TypeScript-типов.
Все данные берутся из существующей модели `MediaItem`.

## Изменения в существующих сущностях

### MediaFilters (`types/index.ts`)

Поле `type` остаётся в интерфейсе (используется в других местах, например `getMediaItems`),
но на странице библиотеки больше не передаётся через `FilterBar`.

```typescript
interface MediaFilters {
  search?: string
  status?: MediaStatus | 'all'
  type?: MediaType | 'all'   // ← больше не используется на /library
  genre?: string
  minRating?: number
  maxRating?: number
}
```

## Группировка (runtime, не в БД)

Группировка `MediaItem[]` по `type` происходит в компоненте `LibrarySections`
на этапе рендеринга — без дополнительных запросов к Supabase.

```typescript
const grouped: Record<MediaType, MediaItem[]> = items.reduce(
  (acc, item) => { acc[item.type].push(item); return acc },
  { movie: [], tv: [], anime: [] }
)
```

## Источники данных

| Источник | Роль |
|---|---|
| `media_items` (Supabase) | Основные данные — загружаются одним запросом без фильтра по типу |
| URL-параметры (`search`, `status`, `sort`, `dir`) | Управление видом и сортировкой |