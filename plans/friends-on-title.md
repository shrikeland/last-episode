## Goal
На своей карточке тайтла видеть, что с этим тайтлом у друзей (статус, оценка, где остановились), а на чужой карточке — ссылку «Моя карточка» вместо серого «Добавлено».

## Approach
Идея: `ideas/009-friends-on-title.md`, цена M, миграции нет, `'use client'` не добавляется.

**Как читать чужие `media_items`, если RLS пускает только владельца** — рассмотренные варианты:
1. **Service client + жёсткая фильтрация в коде** (выбрано). Дружбы и профили читаются обычным RLS-клиентом текущего пользователя (RLS сама ограничивает `friendships` двумя сторонами связи, плюс явный фильтр в запросе). Service client используется только на последнем шаге и только по уже отфильтрованному списку `user_id`. Тот же приём уже работает в `app/actions/users.ts` и на `profile/[username]/media/[id]`. Без миграции, реализуемо за вечер.
2. **Новая RLS-политика на `media_items`** «друг с открытой библиотекой может читать» (`EXISTS` по `friendships` + `profiles.is_library_public`). Чище с точки зрения доступа, но это миграция, она расширяет видимость для **всех** чтений `media_items` обычным клиентом: хелперы, которые фильтруют только по `id` (например `isCompletedMediaItem` в `lib/supabase/progress.ts`), начнут видеть строки друзей, а для `seasons`/`episodes` понадобятся парные политики, иначе «где остановился» всё равно не прочитать и добавляет подзапрос в каждую проверку строки. Для одного блока — непропорционально и рискованно.
3. **`SECURITY DEFINER` функция `friends_with_title(tmdb_id)`** — вся фильтрация в SQL, один round-trip. Но тоже миграция, а в проекте пока нет ни одной RPC — новый паттерн ради одного места.

**Что меняется:**
- `lib/supabase/friends.ts` (новый) — `getFriendsWithTitle(client, userId, tmdbId)`:
  1. `friendships` через RLS-клиент: `status = 'accepted'` и `user_id = me OR friend_id = me` → id друга с другой стороны связи, себя исключаем.
  2. `profiles` через RLS-клиент: `id in (друзья)` и `is_library_public = true` → `id, username`.
  3. `media_items` через service client: `tmdb_id = X` и `user_id in (друзья с открытой библиотекой)`, только `id, user_id, type, status, rating`.
  4. Для сериалов/аниме со статусом «Брошено» или «Смотрю» — последняя отмеченная серия (по `watched_at desc`, как `getLastWatchedAt` в `lib/supabase/progress.ts`), по одному запросу на тайтл друга, параллельно, только по id из шага 3.
  5. Наружу — только `username`, `mediaItemId` (для ссылки), `status`, `rating`, `lastEpisode`. Никаких `user_id`, заметок, дат. Ошибки → `[]`, страница не ломается.
  6. Сортировка: «Просмотрено» → «Смотрю» → «Отложено» → «Брошено» → «Хочу посмотреть» последними; внутри — по оценке, затем по username.
- `components/media/FriendsOnTitle.tsx` (новый, серверный) — блок «У друзей»: строка на друга `@username · статус (S1E3) · оценка`, строка — `Link` на `/profile/<username>/media/<id>`. Пустой список → `null`.
- `app/(app)/media/[id]/page.tsx` — точечно: `getFriendsWithTitle` добавляется в существующий `Promise.all` с TMDB (без водопада), блок рендерится под статусом и оценкой.
- `lib/supabase/media.ts` — `getMediaItemIdByTmdbId(client, userId, tmdbId)` для обратной ссылки.
- `app/(app)/profile/[username]/media/[id]/page.tsx` — `getLibraryTmdbIds` заменяется на поиск моего `media_items.id` по `tmdb_id` (RLS-клиент, `getServerUser()`), передаётся в контрол.
- `components/profile/ProfileAddToLibraryControl.tsx` — опциональный `myMediaItemId`: если есть и контрол не `iconOnly`, вместо «Добавлено» рендерится ссылка «Моя карточка» на `/media/<id>`. Поведение в `ProfileMediaCard` (iconOnly) не меняется.
- `app/actions/tmdb.ts` — `addMediaItem` дополнительно возвращает `id` созданной записи (аддитивно), чтобы сразу после добавления с чужой карточки появлялась ссылка «Моя карточка».

## Checklist
- [x] Сверить карточку с кодом, обновить расхождения, `status: planned`
- [x] `lib/supabase/friends.ts` — `getFriendsWithTitle` с фильтрацией доступа
- [x] `components/media/FriendsOnTitle.tsx` — серверный блок «У друзей»
- [x] `app/(app)/media/[id]/page.tsx` — запрос в `Promise.all` с TMDB, вставка блока
- [x] `lib/supabase/media.ts` — `getMediaItemIdByTmdbId`
- [x] `app/actions/tmdb.ts` — `addMediaItem` возвращает `id`
- [x] `components/profile/ProfileAddToLibraryControl.tsx` — проп `myMediaItemId`, ссылка «Моя карточка»
- [x] `app/(app)/profile/[username]/media/[id]/page.tsx` — мой id вместо `getLibraryTmdbIds`
- [x] `npm run lint` — 0 ошибок
- [x] `npm run build` — 0 ошибок

## Risks / open questions
- **Service role обходит RLS.** Вся защита — в порядке шагов: service client видит только `user_id`, прошедшие шаги 1–2 (принятая дружба с текущим пользователем, `is_library_public = true`). Если список пуст — service client не вызывается вовсе. Любое будущее расширение функции должно сохранять этот порядок.
- Функция живёт в `lib/`, а не в `app/actions/`: серверный экшен можно дёрнуть с клиента с произвольным `tmdbId`, а здесь это не нужно — вызывает только серверная страница.
- Чужая карточка тайтла (`/profile/<username>/media/<id>`) сама по себе не проверяет дружбу — только `is_library_public`. Ссылки из блока ведут туда только для друзей, так что новых утечек нет, но это существующее поведение, не наше.
- «Где остановился» — последняя серия по `watched_at`. У серий, отмеченных синком при добавлении как «Просмотрено», `watched_at = null`; для «Брошено»/«Смотрю» это почти не встречается, в худшем случае показываем статус без серии.
- При массовой отметке у серий одинаковый `watched_at` → вторичная сортировка по номеру серии; межсезонная неоднозначность возможна только при массовой отметке нескольких сезонов в один момент.
- N+1 по «Брошено/Смотрю»: запросов столько, сколько друзей смотрят/бросили этот тайтл — при круге из нескольких друзей это единицы, запросы параллельные.
- Проверить руками: нужен второй аккаунт-друг с этим тайтлом и открытой библиотекой; отдельно — друг с закрытой библиотекой (не должен появиться) и pending-заявка (не должна появиться).
