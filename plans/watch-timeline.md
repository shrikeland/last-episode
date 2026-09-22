# Лента просмотра

Идея: [ideas/002-watch-timeline.md](../ideas/002-watch-timeline.md) · ценность средняя · цена M

## Goal
На странице статистики показать последние 30 дней просмотра по дням: какие серии каких тайтлов человек отмечал и сколько всего вышло за период.

## Approach

**Данные.** Для этой функции хватает одного запроса к `episodes` с inner-джойном `seasons → media_items` через встроенные связи PostgREST (`seasons!inner(..., media_items!inner(...))`), с фильтрами `is_watched = true`, `watched_at >= now - 30d` и `seasons.media_items.user_id = userId`. RLS на `episodes` и так пропускает только свои строки (`episodes_all` в `20260317000000_initial_schema.sql`), но явный фильтр по `user_id` всё равно нужен. Без него функция молча начнёт отдавать чужие данные, если её когда-нибудь вызовут через service-клиент, как это уже делает `app/(app)/profile/[username]/media/[id]/page.tsx`.

В `Database` в `types/index.ts` не описаны `Relationships`, поэтому ответ со встроенными связями не типизируется. Приводим его к локальному типу строки через `as`, как это уже сделано в `app/(app)/stats/page.tsx` (`as SeasonWithEpisodes[]`).

**Индекс.** Нужна миграция с частичным индексом `episodes (watched_at DESC) WHERE watched_at IS NOT NULL`. Без него Postgres сканирует всю таблицу `episodes` и на каждой строке проверяет RLS-подзапрос. Пока данных немного, это незаметно, но таблица будет только расти.

**Группировка.** Её выносим в чистую функцию `groupWatchHistory(rows, timeZone)`, отдельно от запроса и разметки. Она делает три вещи:
1. Раскладывает строки по дням в заданном часовом поясе через `Intl.DateTimeFormat('en-CA', { timeZone })`, ключ дня — `YYYY-MM-DD`
2. Внутри дня схлопывает пачки. Строки с **одинаковым** `watched_at` и одним `media_item_id` превращаются в одну строку «N серий». Такие пачки появляются только после `markSeasonWatched` или `markAllEpisodesWatched`, потому что при ручной отметке у каждой серии свой timestamp с миллисекундами
3. Считает итог: число серий и сумму `runtime_minutes`

Часовой пояс задаётся константой `WATCH_TIMEZONE = 'Europe/Moscow'` в `lib/constants.ts`. Сервер на Vercel работает в UTC, и без этой константы ночные просмотры уедут на предыдущий день.

**UI.** `WatchTimeline` — серверный компонент без `'use client'`: интерактива в нём нет, только ссылки. Визуально он повторяет соседние блоки: `rounded-xl border border-border/50 bg-card`, заголовок секции в стиле `StatsOverview`. Каждая строка — это `Link` на `/media/{id}`, внутри маленький постер, название и `S2 · Серия 7`. Схлопнутая пачка выглядит как `S2 · 12 серий`, а если в ней несколько сезонов — `Весь тайтл · 36 серий`. Дни без просмотров не выводятся.

**Страница.** Сейчас `app/(app)/stats/page.tsx` ходит в БД последовательно. Новый запрос от `mediaItems` не зависит, поэтому запускаем его параллельно с `getMediaItems` через `Promise.all` (правило `async-parallel`).

## Checklist
- [x] `supabase/migrations/20260922183451_episodes_watched_at_index.sql` — `CREATE INDEX idx_episodes_watched_at ON episodes (watched_at DESC) WHERE watched_at IS NOT NULL;`
- [x] `lib/constants.ts` — `WATCH_TIMEZONE = 'Europe/Moscow'` и `WATCH_TIMELINE_DAYS = 30`
- [x] `types/index.ts` — типы `WatchHistoryRow` (плоская строка после запроса), `WatchTimelineEntry` (строка ленты, одиночная или пачка) и `WatchTimelineDay` (`{ dateKey, label, entries }`)
- [x] `lib/supabase/progress.ts` — `getRecentWatchHistory(client, userId, days): Promise<WatchHistoryRow[]>`: запрос, приведение типа, сплющивание вложенных `seasons.media_items` в плоскую строку. Добавить `.limit(1000)` как предохранитель
- [x] `lib/timeline.ts` — чистая функция `groupWatchHistory(rows, timeZone)` → `{ days: WatchTimelineDay[], totalEpisodes, totalMinutes }`. Подпись дня делаем по-русски: «Сегодня», «Вчера», иначе `22 сентября, пн`
- [x] `components/stats/WatchTimeline.tsx` — серверный компонент: строка итога («за 30 дней: 48 серий, 31 ч»), дальше дни и строки. Перед этим проверить, подходит ли `components/media/MediaPoster.tsx` для миниатюры ~40px; если не подходит — `next/image` с `poster_url`
- [x] Пустое состояние: если за 30 дней ничего нет, секция показывает одну строку «За последние 30 дней отметок нет», а не исчезает
- [x] `app/(app)/stats/page.tsx` — `Promise.all([getMediaItems(...), getRecentWatchHistory(...)])`, вызов `groupWatchHistory` и `<WatchTimeline />` под сеткой `StatsBreakdown / GenreTopList`
- [x] Применить миграцию (применена к Supabase Cloud 2026-09-22 через MCP, индекс проверен в `pg_indexes`)
- [x] `npm run build` и `npm run lint` — 0 ошибок
- [ ] Ручная проверка: отметить серию, открыть статистику и увидеть её под «Сегодня». Отметить сезон целиком — должна появиться одна строка-пачка. Снять отметку — строка должна пропасть. Проверить на аккаунте с пустой библиотекой

## Risks / open questions
- **Пачки искажают итог.** Массовая отметка часто означает «добиваю то, что смотрел давно», а не «посмотрел сегодня». Если человек разом закрыл три сезона, итог за 30 дней вырастет на 36 серий. По плану пачки входят в итог, чтобы не усложнять. Если это будет раздражать, пачки можно исключить из итога, оставив их в ленте
- **Часовой пояс зашит в код.** `Europe/Moscow` подходит, пока все друзья в одном поясе. Хранить пояс в профиле — отдельная задача с миграцией, в скоуп этой не входит
- **Фильмы в ленту не попадают:** у `media_items` нет даты просмотра. Добавить её (`completed_at`) можно, но это отдельная идея с миграцией и правкой смены статуса
- **Синтаксис фильтра по вложенной связи.** `.eq('seasons.media_items.user_id', ...)` при двух уровнях `!inner` в supabase-js 2.46.2 работает. Если на практике что-то не так, запасной вариант — RPC-функция на SQL, но это ещё одна миграция. Перед реализацией стоит сверить с актуальной документацией через Context7
- **Переотметка теряет историю.** При снятии отметки `watched_at` обнуляется (`toggleEpisodeWatched`, `markSeasonWatched`), так что лента показывает только текущее состояние, а не журнал событий. Для этой идеи этого достаточно
