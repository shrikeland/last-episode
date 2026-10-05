# Оптимизация скорости episode.watch

## Context

Карточка тайтла открывается ~30 с. Это не лимиты бесплатного Vercel, а две проблемы, которые перемножаются:

1. **Синк эпизодов на каждом открытии.** `app/(app)/media/[id]/page.tsx:45-62` на каждом заходе в сериал/аниме тянет из TMDB все сезоны (`revalidate: 0`, без кэша) и вызывает `syncSeasonsAndEpisodes` (`lib/supabase/progress.ts:27-113`). Она делает **по одному `UPDATE` на каждый уже сохранённый эпизод, последовательно** (`:97-111`), даже если ничего не поменялось. Страница ждёт этого до рендера. В базе: «Ван-Пис» — 1155 эпизодов, «Наруто: Ураганные хроники» — 500, «Блич» — 406.
2. **Функции работают через Атлантику.** Замер прода: `x-vercel-id: arn1::iad1::…`. Вход в Стокгольме, функция в Вашингтоне (`iad1`, дефолт, `vercel.json` нет), а Supabase в `eu-west-1` (Ирландия). Каждый запрос к базе стоит ~75–80 мс.

Итого 500 эпизодов × ~80 мс ≈ 40 с, а «Ван-Пис» ≈ 90 с. Всё сходится. Вдобавок на каждом переходе два вызова `auth.getUser()` (proxy + layout), нет кэша TMDB, нет стриминга. На клиенте полноэкранный WebGL-фон и canvas крутят анимацию каждый кадр на всех страницах.

Решения по развилкам (вы подтвердили): синк **по диффу** (без миграции для синка). В объём входит всё: сервер, клиентский фон, навигация.

## Про Vercel и VDS

Переезд сейчас не нужен. После фиксов ниже типичный запрос тайтла — это несколько запросов к базе по ~2 мс (Дублин↔Ирландия) плюс кэшированный TMDB. Для 20–30 друзей Hobby хватает с большим запасом: лимиты там на объём, а не на скорость.

VDS имеет смысл, только если упрётесь в доступность Vercel из РФ или в месячные лимиты. Конфигурация на такой случай:
- 2 vCPU, 4 GB RAM, 40 GB NVMe;
- локация Нидерланды или Германия, рядом с Supabase в Ирландии;
- Ubuntu 24.04, Docker, `next build` в режиме `output: 'standalone'`, Caddy для TLS;
- ~500–900 ₽/мес;
- Supabase остаётся в облаке.

## Порядок работ (отдельный коммит на каждый шаг)

По CLAUDE.md перед стартом скопировать этот план в `plans/site-performance.md`.

### 1. Регион функций → Дублин (`chore(deploy)`)
- Новый `vercel.json`: `{ "regions": ["dub1"] }`. Hobby допускает один регион.
- В проекте Vercel проверить, что регион в Settings → Functions не переопределён.

### 2. Синк эпизодов по диффу + кэш TMDB (`fix(media)`)
- **`lib/tmdb/tmdb.service.ts`**
  - Общий хелпер `tmdbFetch(url, revalidate)` с `signal: AbortSignal.timeout(8000)`.
  - `getTVDetails`: `revalidate: 21600` (6 ч) для `/tv/{id}` и сезонов.
  - `getTopCast`: 24 ч.
  - Поиск (`:58`, `:85`) оставить без кэша, только таймаут.
- **`lib/supabase/progress.ts`**
  - `getSeasonsWithEpisodes`: один запрос `seasons.select('*, episodes(*)')` с сортировкой вложенных (`order('episode_number', { referencedTable: 'episodes' })`) вместо 1+N.
  - Переписать `syncSeasonsAndEpisodes(client, mediaItemId, tmdbSeasons, existing: SeasonWithEpisodes[], markNewWatched: boolean): Promise<boolean>`:
    - сравнивает TMDB с тем, что уже прочитано из базы;
    - сезоны, которых нет или которые изменились (name / episode_count / tmdb_season_id), — одним `upsert` (`onConflict: 'media_item_id,season_number'`) с `.select('id, season_number')`;
    - новые эпизоды — одним `insert` с `is_watched: markNewWatched`, `watched_at: null`;
    - изменённые эпизоды (name / runtime / tmdb_episode_id) — одним `upsert` (`onConflict: 'season_id,episode_number'`, уникальный индекс `episodes_unique_season_episode` уже есть). В payload только метаданные, так что `is_watched` и `watched_at` не трогаются;
    - возвращает `true`, если что-то записала;
    - `isCompletedMediaItem` здесь больше не нужен: статус передаёт страница. Для `createSeasonsAndEpisodes` его оставить.
- **`app/(app)/media/[id]/page.tsx`**:
  - после `item` параллельно читаются сезоны из базы и `getTVDetails` (с `.catch(() => null)`);
  - затем дифф-синк; повторное чтение сезонов только если синк вернул `true`;
  - `getLibraryItemIds` цепляется сразу к `related`, а не ждёт синка.
- Проверить, кто ещё вызывает `syncSeasonsAndEpisodes` / `getTVDetails` (grep), и обновить сигнатуры.

### 3. Стриминг страницы тайтла (`refactor(media)`)
- Страница ждёт только `item` и сразу отдаёт шапку: постер, статус, рейтинг, описание, заметки.
- Каст, похожие (+ `libraryItemIds`), друзья и сезоны вынести в async server components в `components/media/`, каждый в своём `<Suspense>` со скелетоном в стиле существующего `app/(app)/media/[id]/loading.tsx`.
- `SeasonAccordion` остаётся клиентским, данные в него передаёт серверная обёртка.

### 4. Прогресс библиотеки в базе + индекс (`fix(db)`, `fix(library)`)
- Миграция `supabase/migrations/<ts>_episode_progress_rpc.sql`:
  - функция `get_episode_progress(item_ids uuid[])` — `security invoker` (действует RLS), `returns table(media_item_id uuid, watched int, total int)`, считает `count(*) filter (where is_watched)` и `sum(episode_count)`;
  - `create index if not exists idx_friendships_friend_id on friendships(friend_id)` для `getPendingCount` в layout.
- Применять через `apply_migration`, потом переименовать файл под версию (см. память).
- `getEpisodeProgressMap` (`lib/supabase/media.ts:182`) → один `client.rpc(...)`. Заодно уходит тихая обрезка на 1000 строк.
- `hasPlannedSeasons` (`progress.ts:303`): вместо выгрузки всех эпизодов — `count: 'exact', head: true`.
- Добавить типы RPC в `types` (`Database['public']['Functions']`).

### 5. Один auth-вызов на переход (`refactor(auth)`) — затрагивает auth, поэтому отдельный коммит
- `proxy.ts`: удалить входящий заголовок `x-auth-user` (защита от подделки). После `getUser()` положить в заголовки запроса `{ id, email }` проверенного пользователя.
- `getServerUser()` (`lib/supabase/server.ts`): сначала читать заголовок через `headers()`, иначе fallback на `auth.getUser()`.
- Grep, какие поля `User` используются (`id`, `email`, `user_metadata`?). Если нужны другие поля, класть их в заголовок или отказаться от шага.
- Layout guard `redirect('/login')` остаётся как есть.
- API routes не трогаем.
- Делать после шага 1 и замера. Если после переезда в Дублин разница < 50 мс, шаг можно пропустить.

### 6. Клиентский фон и карточки (`fix(ui)`)
- **`components/AppShell.tsx`**: `LightRays` и `ClickSpark` через `next/dynamic({ ssr: false })`.
- **`components/LightRays.jsx`**:
  - dpr ограничить `Math.min(devicePixelRatio, 1)`;
  - пауза rAF при `document.hidden` (`visibilitychange`);
  - при `prefers-reduced-motion` не запускать цикл;
  - `raysColor` убрать из зависимостей инициализации и обновлять uniform через ref, чтобы смена темы не пересоздавала WebGL;
  - `mousemove` с `{ passive: true }`.
- **`components/ui/ClickSpark.tsx`**: rAF только пока есть искры; стартует по клику и останавливается, когда массив пуст.
- **`contexts/ThemeContext.tsx`**: `useMemo` для value.
- **`components/library/MediaCard.tsx`**:
  - тилт и блик через ref + прямую запись `style.transform` в rAF вместо двух `setState` на каждый `mousemove`;
  - `sizes` → `"152px"` для карточек в ScrollRow (`MediaRow.tsx:14`).

### 7. Навигация (`fix(nav)`)
- `components/AppDock.tsx`: `router.prefetch()` для 5 маршрутов дока при монтировании (страницы `force-dynamic`, поэтому префетч грузит до `loading.tsx` и скелетон появляется мгновенно). `Dock.tsx` не трогаем.

## Проверка

1. После каждого шага: `npm run build` и `npm run lint`, 0 ошибок, полный вывод.
2. Шаг 2, локально с логированием количества записей синка:
   - повторный заход на «Ван-Пис» даёт 0 записей;
   - после ручного изменения `name` у одного эпизода через SQL — ровно 1 upsert, `is_watched` не меняется;
   - новый тайтл, добавленный в статусе `completed`, получает эпизоды с `is_watched = true`.
3. `getSeasonsWithEpisodes` на «Ван-Писе» возвращает все 1155 эпизодов: проверить, что вложенный select не режется `max_rows`. Если режется, вернуть параллельные запросы по сезонам.
4. RPC прогресса: сравнить вывод со старой реализацией на своей библиотеке (SQL-запросом).
5. E2E: `npx playwright test` локально. В CI по пушу ветки проверить, что `skipped ≈ 0`.
6. На preview-деплое:
   - заголовок `x-vercel-id` содержит `dub1`;
   - открытие «Ван-Писа» / «Ураганных хроник» занимает < 1–2 с (in-app browser, Network → TTFB документа);
   - переходы по доку показывают скелетон сразу;
   - фон не грузит CPU во вкладке в фоне (Performance-профиль).
7. Ручной чек-лист из CLAUDE.md: логин/логаут, добавление тайтла, отметка эпизода сохраняется после перезагрузки, смена статуса.

## Риски
- Upsert эпизодов под RLS требует политики INSERT и UPDATE на `episodes`. Обе уже используются, но при падении с 42501 проверить политику.
- Кэш TMDB на 6 ч: новая серия появится с задержкой до 6 ч. Для трекера это приемлемо.
- Шаг 5 меняет источник пользователя для всего сервера. Заголовок обязательно чистить в proxy, иначе клиент подставит чужой id.
