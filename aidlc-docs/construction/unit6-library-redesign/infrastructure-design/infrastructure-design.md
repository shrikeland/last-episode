# Infrastructure Design — Unit 6: Library Redesign

## Изменения в инфраструктуре

Unit 6 является **чисто фронтендным** юнитом.

- Нет новых таблиц БД
- Нет миграций
- Нет новых API-маршрутов
- Нет новых Server Actions
- Нет новых переменных окружения

---

## Изменения в существующих файлах

### `app/(app)/library/page.tsx`
- Заменён импорт `MediaGrid` → `LibrarySections`
- Убран `type` из `MediaFilters`
- Обновлена логика `hasFilters`

### `components/library/FilterBar.tsx`
- Удалён Select «Тип» и соответствующие импорты

### `app/globals.css`
- Добавлен утилити-класс `.scrollbar-hide` (три cross-browser правила)

---

## Новые файлы

```
components/library/
  MediaRow.tsx        ← Client Component: горизонтальный скролл + стрелки
  MediaSection.tsx    ← Server Component: секция с заголовком
  LibrarySections.tsx ← Server Component: роутер секции/грид
```

---

## Производительность

- **Один запрос к Supabase** — тайтлы загружаются без фильтра по типу; группировка по типу выполняется в JS на сервере (O(n), мгновенно).
- **ResizeObserver** + **passive scroll listener** — не блокируют главный поток.
- **`behavior: 'smooth'`** в `scrollBy` — нативная CSS-анимация, без JS-таймеров.
- Fade-градиенты реализованы через CSS `opacity transition` без JS-анимаций.

---

## Совместимость

| API | Поддержка |
|---|---|
| `ResizeObserver` | Chrome 64+, Firefox 69+, Safari 13.1+ |
| `scrollBy({ behavior: 'smooth' })` | Chrome 61+, Firefox 36+, Safari 15.4+ |
| CSS `scroll-behavior: smooth` | Все современные браузеры |

Для устаревших браузеров прокрутка работает без анимации (graceful degradation).