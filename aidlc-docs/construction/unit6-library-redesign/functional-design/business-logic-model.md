# Business Logic Model — Unit 6: Library Redesign

## Поток данных

```
/library?search=&status=&sort=&dir=
         │
         ▼
LibraryPage (Server Component)
  ├── getMediaItems(supabase, userId, filters, sort)
  │     └── filters: { search, status }   ← type убран
  │
  ├── hasFilters = !!(search || status !== 'all')
  │
  └── <LibrarySections items={items} hasFilters={hasFilters} />
              │
    ┌─────────┴──────────┐
    │ hasFilters = false  │ hasFilters = true
    │                     │
    ▼                     ▼
LibrarySections        MediaGrid
  группирует по type   (плоская сетка)
  → MediaSection[]
       └── MediaRow (client)
             ├── overflow-x-auto
             ├── scroll ← / →
             └── MediaCard[]
```

## Логика переключения режимов

| URL | hasFilters | Режим отображения |
|---|---|---|
| `/library` | false | Секции по типам |
| `/library?search=наруто` | true | Грид |
| `/library?status=watching` | true | Грид |
| `/library?sort=rating&dir=desc` | false | Секции по типам (сортировка внутри рядов) |

## Логика прокрутки (MediaRow)

```
mount/resize
  └── checkScroll()
        ├── canScrollLeft  = scrollLeft > 4
        └── canScrollRight = scrollLeft + clientWidth < scrollWidth - 4

scroll event → checkScroll()

button click (dir)
  └── el.scrollBy({ left: ±(clientWidth * 0.8), behavior: 'smooth' })
```

ResizeObserver обеспечивает корректный пересчёт стрелок при изменении
размера окна или добавлении/удалении элементов.