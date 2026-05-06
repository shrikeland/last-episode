# План доработок библиотеки и карточек

## Цель
Закрыть 10 пользовательских доработок в библиотеке, поиске, деталях тайтла и публичных профилях без изменения файлов вне репозитория и без удаления существующих данных.

## Общий подход
- Работать только внутри `/Users/hornysennin/Projects/last-episode`.
- Не трогать чужие staged deletion/изменения, кроме явного восстановления/обновления этого `PLAN.md`.
- Не менять схему БД, если задачу можно решить через существующие поля `media_items`, `seasons`, `episodes` и живой запрос к TMDB.
- Для Next.js сохранять Server Components по умолчанию; клиентскими оставлять только интерактивные элементы.
- Перед финальным коммитом выполнить `npm run build` и `npm run lint`.

## Предварительная оценка

### Простые и локальные
1. Сортировка "Сначала новые/старые" по году выпуска:
   - `types/index.ts`: расширить/переосмыслить `SortField`, добавить `release_year`.
   - `components/library/FilterBar.tsx`: поменять значения select на `release_year_desc/asc`, подписи оставить пользовательскими.
   - `app/(app)/library/page.tsx` и `lib/supabase/media.ts`: дефолт сортировки перевести на `release_year desc`.

2. Оценка на карточках библиотеки:
   - `components/library/MediaCard.tsx`: добавить компактный бейдж с `Star` и `rating / 10`, если оценка задана.
   - Желательно повторить в `components/profile/ProfileMediaCard.tsx`, чтобы публичная библиотека выглядела консистентно.

4. Исправить звездочки внутри карточки тайтла:
   - `components/media/RatingInput.tsx`: заменить самодельный path/gradient на стабильную SVG-иконку через `lucide-react` `Star` или общий компонент с корректной half-fill маской.

5. Переименовать сезонную кнопку:
   - `components/media/SeasonAccordion.tsx`: только кнопку конкретного сезона изменить с `Отметить всё` на `Отметить сезон`; title-level кнопку оставить `Отметить всё`.

10. Крестик очистки поисковой строки:
   - `components/search/SearchInput.tsx`: добавить `X`/`XCircle` icon-button справа, очищающий `query`, `results`, `libraryIds`, `searched`, и pending timer.

### Средние
6. Не ставить тайтл "Просмотрен", если есть запланированные сезоны:
   - Проблема: `updateStatus(..., completed)` сейчас для всех сериалов/аниме вызывает `markAllEpisodesWatched`, включая сезоны без вышедших эпизодов или будущие/пустые сезоны.
   - Решение без миграции: добавить в `lib/supabase/progress.ts` helper, который определяет, есть ли у тайтла сезоны без эпизодов, и в `app/actions/progress.ts` не делать blanket mark watched для таких тайтлов. Статус либо не переводить в `completed`, либо откатывать на `watching` с сообщением. Предпочтение: запретить `completed` и вернуть `{ error: 'planned_seasons' }`, чтобы UI показал toast.
   - Дополнительно: в `StatusSelect` оптимистический статус должен откатываться при ошибке.

7. Спойлер большого описания в поиске:
   - `components/search/TmdbResultCard.tsx`: заменить `line-clamp-2` на контролируемый expand/collapse. Для коротких описаний кнопка не нужна; для длинных показывать компактную ссылку `Показать полностью` / `Свернуть`.

9. При добавлении нового тайтла сразу выбирать статус и оценку:
   - `app/actions/tmdb.ts`: расширить `addMediaItem(tmdbId, type, options?)` с `status` и `rating`.
   - `lib/supabase/media.ts`: `createMediaItem` принимает опции, ставит `planned` только по умолчанию.
   - `components/search/TmdbResultCard.tsx`: добавить inline controls до нажатия "Добавить": select статуса и компактная оценка 0.5-10 или без оценки.
   - Важно: если сразу выбран `completed` для сериала/аниме с будущими сезонами, применить правило из пункта 6.

### Крупные / лучше делегировать отдельно
3. Переход внутрь карточки тайтла в библиотеке другого пользователя:
   - Добавить публичный read-only route, например `app/(app)/profile/[username]/media/[id]/page.tsx`.
   - Доступ проверять через `getUserProfile`/service client и `profile.is_library_public`.
   - Карточки `ProfileMediaCard` должны стать ссылками на этот route.
   - Страница должна показывать детали без приватных controls: без `StatusSelect`, `RatingInput`, `NotesEditor`, но с публичной оценкой/статусом/прогрессом.

8. Актерский состав с фото:
   - Расширить `lib/tmdb/tmdb.service.ts`: `getCreditsWithPhotos(tmdbId, mediaKind)` или расширить `getCredits`, возвращая `{ name, character, profileUrl }`.
   - Добавить тип `TmdbCastMember`.
   - Добавить компонент `components/media/CastList.tsx` с горизонтальным списком фото.
   - Использовать на личной странице тайтла и публичной read-only странице.
   - Данные не хранить в Supabase на первом этапе: TMDB уже источник правды, а это снижает риск миграций.

## Разбиение по агентам

### Агент A: библиотека и карточки
Файлы:
- `types/index.ts`
- `lib/supabase/media.ts`
- `app/(app)/library/page.tsx`
- `components/library/FilterBar.tsx`
- `components/library/MediaCard.tsx`
- `components/profile/ProfileMediaCard.tsx`

Задачи:
- Перевести дефолтную сортировку "новые/старые" на `release_year`.
- Добавить вывод пользовательской оценки на карточках.
- Сохранить существующий UX фильтрации и URL-параметров.

### Агент B: поиск и добавление
Файлы:
- `components/search/SearchInput.tsx`
- `components/search/TmdbResultCard.tsx`
- `app/actions/tmdb.ts`
- `lib/supabase/media.ts` (координация с Агентом A)
- `types/index.ts` (координация с Агентом A)

Задачи:
- Добавить очистку поисковой строки.
- Добавить expand/collapse для описания.
- Добавить выбор статуса и оценки перед добавлением.
- Расширить server action добавления с безопасными defaults.

### Агент C: публичный read-only detail и актеры
Файлы:
- `app/(app)/profile/[username]/media/[id]/page.tsx` (new)
- `components/profile/ProfileMediaCard.tsx`
- `components/profile/ProfileMediaRow.tsx`
- `components/profile/ProfileLibrarySections.tsx`
- `lib/tmdb/tmdb.service.ts`
- `types/index.ts`
- `components/media/CastList.tsx` (new)

Задачи:
- Сделать переход из чужой публичной библиотеки внутрь карточки.
- Добавить read-only detail page.
- Добавить актерский состав с фото на личной и публичной странице.

### Агент D: прогресс, статус и звезды
Файлы:
- `components/media/SeasonAccordion.tsx`
- `components/media/RatingInput.tsx`
- `components/media/StatusSelect.tsx`
- `app/actions/progress.ts`
- `lib/supabase/progress.ts`

Задачи:
- Переименовать сезонную кнопку.
- Исправить визуал звезд рейтинга.
- Запретить автоперевод в `completed`, если есть запланированные/пустые сезоны; UI должен откатить optimistic state и показать ошибку.

## Риски / открытые вопросы
- В рабочем дереве уже есть staged deletion старых файлов (`PLAN.md`, `plans/*`, `.claude/*`, `ARCHITECTURE.md`, `ROADMAP.md`). Их нельзя случайно включить в финальный коммит.
- Пункты 6 и 9 пересекаются: добавление с `completed` должно уважать запрет по будущим сезонам.
- TMDB cast может требовать `TMDB_API_KEY` в build/runtime. Если ключа нет, страница должна gracefully показывать пустой cast, а build не должен падать.
- Для публичной страницы нельзя показывать приватные заметки (`notes`) другого пользователя.

## Проверка
- `npm run build`
- `npm run lint`
- Минимальный ручной smoke через dev server:
  - библиотека сортируется по году выпуска;
  - карточки показывают оценку;
  - поиск очищается крестиком;
  - описание в поиске раскрывается;
  - добавление тайтла принимает статус и оценку;
  - сезонная кнопка называется `Отметить сезон`;
  - публичная карточка профиля ведет на read-only detail;
  - cast list не ломает страницу при пустом ответе TMDB.
