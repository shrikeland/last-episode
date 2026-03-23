# Frontend Components — Unit 6: Library Redesign

## Новые компоненты

### MediaRow (`components/library/MediaRow.tsx`)
**Тип**: Client Component (`'use client'`)

Горизонтальный прокручиваемый ряд карточек с навигационными кнопками.

**Props:**
```typescript
interface MediaRowProps {
  items: MediaItem[]
}
```

**Состояние:**
- `canScrollLeft: boolean` — показывать ли кнопку ←
- `canScrollRight: boolean` — показывать ли кнопку →

**Эффекты:**
- `useEffect` при монтировании: вызов `checkScroll()`, подписка на `scroll` event и `ResizeObserver`
- Cleanup: отписка при размонтировании

**Layout:**
```
[relative wrapper — group/row]
  ├── left fade gradient  (opacity: canScrollLeft ? 1 : 0)
  ├── ← button           (opacity-0 group-hover/row:opacity-100, invisible если !canScrollLeft)
  ├── [scroll container — flex overflow-x-auto scrollbar-hide]
  │     └── [w-[140px] sm:w-[152px]] × N карточек
  ├── right fade gradient
  └── → button
```

**Ширина карточки в ряду:** `w-[140px]` (mobile) / `w-[152px]` (sm+)

---

### MediaSection (`components/library/MediaSection.tsx`)
**Тип**: Server Component

Секция с заголовком и горизонтальным рядом.

**Props:**
```typescript
interface MediaSectionProps {
  type: MediaType
  items: MediaItem[]
}
```

Возвращает `null` если `items.length === 0`.

**Layout:**
```
[space-y-3]
  ├── [flex items-center gap-2]
  │     ├── emoji иконка (🎬 / 📺 / ⛩️)
  │     ├── h2 название секции
  │     └── span счётчик (text-muted-foreground)
  └── <MediaRow items={items} />
```

**Иконки секций:**
```typescript
const SECTION_ICONS: Record<MediaType, string> = {
  movie: '🎬',
  tv: '📺',
  anime: '⛩️',
}
```

---

### LibrarySections (`components/library/LibrarySections.tsx`)
**Тип**: Server Component

Роутер между режимом секций и режимом грида.

**Props:**
```typescript
interface LibrarySectionsProps {
  items: MediaItem[]
  hasFilters: boolean
}
```

**Логика:**
- `hasFilters = true` → рендерит `<MediaGrid items={items} hasFilters={hasFilters} />`
- `hasFilters = false`, `items.length === 0` → рендерит `<EmptyState hasFilters={false} />`
- `hasFilters = false`, есть тайтлы → рендерит три `<MediaSection>` в порядке `['movie', 'tv', 'anime']`

---

## Изменённые компоненты

### FilterBar (`components/library/FilterBar.tsx`)

**Убрано:** Select «Тип» (`MEDIA_TYPE_LABELS`, `MediaType` import)

**Осталось:** поиск + Select «Статус» + Select «Сортировка»

---

### library/page.tsx (`app/(app)/library/page.tsx`)

**Убрано:** `type` из `MediaFilters`, `MediaType` из imports, `MediaGrid` import

**Добавлено:** `LibrarySections` import

**Изменено:**
```typescript
// Было:
const hasFilters = !!(params.search || (params.status && ...) || (params.type && ...) || params.genre)

// Стало:
const hasFilters = !!(params.search || (params.status && params.status !== 'all'))
```

---

## CSS

### `app/globals.css`

Добавлен утилити-класс для скрытия скроллбара:
```css
.scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

---

## Будущие улучшения (вне scope Unit 6)

- **«Смотреть все»** — ссылка в заголовке секции, открывающая грид отфильтрованный по типу
- **Бесконечная прокрутка** внутри ряда (lazy load следующих карточек)
- **Адаптация для мобильных** — свайп-жесты вместо кнопок на тач-устройствах
- **Skeleton-loader** для рядов при SSR hydration