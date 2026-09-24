## Goal
Различать фильмы и сериалы TMDB с одинаковым числовым id: уникальность и все проверки «уже в библиотеке» идут по паре (kind, tmdb_id), а не по одному tmdb_id.

## Контекст (EXPLORE)
- `media_items_unique_user_tmdb UNIQUE (user_id, tmdb_id)` (`20260317000000_initial_schema.sql:29`) — фильм N блокирует сериал N.
- TMDB-пространство однозначно выводится из `type`, и это инвариант кода, а не совпадение:
  - `normalizeType` (`lib/tmdb/tmdb.service.ts`): `movie` → `movie | animation`, `tv` → `tv | anime`. Аниме-фильм («Твоё имя») хранится как `animation`, западный анимационный сериал (Arcane) — как `tv`.
  - `addMediaItem` / `addRecommendedTitle`: `movie | animation` → `/movie/{id}`, остальное → `/tv/{id}`.
  - `type` после вставки не меняется: `updateMediaItem` патчит только `status | rating | notes`.
  - Итог: `tmdb_kind = CASE WHEN type IN ('movie','animation') THEN 'movie' ELSE 'tv' END`.
- Места, где сравнивается только `tmdb_id`:
  - `app/actions/tmdb.ts` → `getLibraryTmdbIds`; его вызывают `SearchInput`, `RecommendationsPage`, `ProfileLibrarySections` и страница тайтла в профиле друга
  - `app/(app)/media/[id]/page.tsx` → проверка связанных тайтлов → `TitleRecommendations` (`initialAddedIds`)
  - `ProfileMediaRow`, `RecommendationResults` → `Set<number>.has(tmdb_id)`
  - `app/api/recommendations/generate/route.ts` → исключение тайтлов из библиотеки (`new_only`), dedup внутри батча, anti-repeat по `recommendation_history`, dedup при повторном запросе
  - `recommendation_history` хранит только `tmdb_id`
  - `SearchInput` использует `key={result.tmdb_id}`: `/search/multi` может вернуть фильм 1399 и сериал 1399 одновременно, тогда React-ключи дублируются
- `lib/compare.ts` в `main` нет (не влит) → не трогаем.
- `anime_filler_cache` / `filler_episodes` завязаны на `tmdb_id`, но филлеры бывают только у аниме (всегда `tv`), так что пространство одно → не трогаем.
- `getRelatedTitles`: dedup внутри одного `mediaType` (collection/recommendations/similar одного вида) → коллизий нет.

## BRAINSTORM — подходы
1. **Сгенерированная колонка** `tmdb_kind TEXT GENERATED ALWAYS AS (CASE … END) STORED` + `UNIQUE (user_id, tmdb_kind, tmdb_id)`. ✅ **Выбран.**
   - Бэкфилл делает сам Postgres: `ADD COLUMN … STORED` переписывает таблицу и вычисляет значение для всех строк.
   - Рассинхрон `type`/`tmdb_kind` невозможен в принципе.
   - Не важен порядок деплоя: старый код, который не знает про колонку, продолжает вставлять строки.
   - Минус: kind жёстко связан с `type`. Если когда-нибудь появится «аниме-фильм» с `type='anime'`, выражение придётся поменять новой миграцией. Сейчас такого нет (см. инвариант выше).
2. **Обычная колонка** `NOT NULL CHECK (tmdb_kind IN ('movie','tv'))` + `UPDATE` для бэкфилла, приложение пишет kind явно.
   - Плюс: kind не зависит от `type`.
   - Минусы: между миграцией и деплоем старый код падает на `NOT NULL` (лечится триггером или DEFAULT-костылём). Появляется второй источник правды, который может разойтись с `type`, если не добавить CHECK на согласованность, а с таким CHECK это по сути вариант 1 с лишним кодом.
3. **Без колонки**: уникальный индекс по выражению `(user_id, (CASE …), tmdb_id)`, фильтры в запросах через `type IN (…)`.
   - Минусы: запросы «есть ли пара (kind, id)» через PostgREST превращаются в громоздкие `or(and(...))`, а выражение дублируется в SQL и TS.

`recommendation_history`: вариант 1 невозможен (там нет `type`). Добавляем nullable `tmdb_kind` с CHECK. У старых строк kind неизвестен, поэтому `NULL` = «legacy, совпадает с любым kind» (консервативный anti-repeat). Через 45 дней такие строки выпадут из окна сами.

## Approach
- **Миграция** `supabase/migrations/20260924120000_media_items_tmdb_kind.sql` (одна транзакция):
  - `media_items`: `ADD COLUMN tmdb_kind … GENERATED ALWAYS AS (…) STORED`
  - `DROP CONSTRAINT IF EXISTS media_items_unique_user_tmdb`
  - `ADD CONSTRAINT media_items_unique_user_kind_tmdb UNIQUE (user_id, tmdb_kind, tmdb_id)`
  - `recommendation_history`: `ADD COLUMN tmdb_kind TEXT CHECK (tmdb_kind IN ('movie','tv'))`, nullable, без бэкфилла
  - RLS-политики построчные (`auth.uid() = user_id`) и от колонок не зависят → не трогаем, остаются включены
- **`lib/tmdb/kind.ts`** (чистый модуль, можно импортировать и на клиенте):
  - `tmdbKindOf(type)` — зеркало SQL-выражения
  - `tmdbTitleKey(kind, id)` → `'movie:1399'`
  - `mediaTitleKey(type, id)`
- **`types/index.ts`**:
  - `TmdbKind`, `MediaItem.tmdb_kind`
  - `Insert`/`Update` не пропускают `tmdb_kind` (сгенерированную колонку писать нельзя)
  - `recommendation_history`: `tmdb_kind`
- **`app/actions/tmdb.ts`**: `getLibraryTmdbIds(ids)` → `getLibraryTitleKeys(refs: { tmdbId, type }[]) → string[]`. Запрос `.in('tmdb_id', …)` + `select('tmdb_id, tmdb_kind')`, возвращаем ключи.
- **Потребители**: переходят на `Set<string>` ключей
  - `SearchInput` (+ `key` и `data-testid` по ключу; e2e ищет по префиксу `tmdb-result-card-`, так что не ломается)
  - `RecommendationsPage` / `RecommendationResults`
  - `ProfileLibrarySections` / `ProfileMediaRow`
  - страница тайтла в профиле друга
  - `media/[id]` → `TitleRecommendations` (`initialAddedKeys`)
- **`route.ts` рекомендаций**:
  - `libraryTmdbIds` → ключи
  - dedup в `enrichWithTmdb` и при повторном запросе → ключи
  - anti-repeat: `recentKeys` + `legacyRecentIds` (строки без kind)
  - `saveRecommendationHistory` пишет `tmdb_kind`
- Добавление тайтла менять не нужно: при вставке kind вычисляется из `type`, а ошибка `23505` → `already_exists` теперь срабатывает только на настоящий дубль.

## Checklist
- [x] Миграция с колонкой, заменой UNIQUE и колонкой в `recommendation_history`
- [x] Прогон всех миграций в одноразовом `postgres:17` (со stub-схемами `auth`/`extensions`): бэкфилл, новый UNIQUE, RLS на месте
- [x] `lib/tmdb/kind.ts` + типы
- [x] `getLibraryTitleKeys` вместо `getLibraryTmdbIds`
- [x] `SearchInput` / `TmdbResultCard` (`key` и `testid`)
- [x] `RecommendationsPage` / `RecommendationResults`
- [x] `ProfileLibrarySections` / `ProfileMediaRow` / страница тайтла в профиле друга
- [x] `media/[id]` + `TitleRecommendations`
- [x] `route.ts` рекомендаций + `recommendation_history`
- [x] `npm run lint` — 0 ошибок
- [x] `npm run build` — 0 ошибок
- [ ] Применить миграцию к удалённой БД — **только после подтверждения пользователя**

## Risks / open questions
- `ADD COLUMN … STORED` переписывает таблицу под `ACCESS EXCLUSIVE`-локом. `media_items` маленькая, так что это доли секунды.
- Порядок деплоя: миграцию можно применить до деплоя кода. Старый код колонку не читает, а новый UNIQUE строго слабее старого, значит ни одна существующая строка его не нарушит. Новый код без миграции упадёт на `select('tmdb_kind')`, поэтому **сначала миграция, потом деплой**.
- Если появится «аниме-фильм» с отдельным `type`, придётся менять генерирующее выражение (новая миграция: `DROP COLUMN` + `ADD COLUMN` с пересборкой UNIQUE).
