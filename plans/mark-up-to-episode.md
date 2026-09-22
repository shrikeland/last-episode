## Goal
Одним кликом на строке серии отметить просмотренными все серии до неё включительно — в текущем сезоне или вместе со всеми предыдущими.

Карточка: `ideas/006-mark-up-to-episode.md`.

## Approach
- **Хелпер БД** — `markEpisodesUpTo` в `lib/supabase/progress.ts`, рядом с `markSeasonWatched`. Отмечает только неотмеченные серии (`is_watched = false`), уже отмеченные не трогает и их `watched_at` не перезаписывает
- **Один timestamp на всю операцию.** Лента просмотра (`lib/timeline.ts:26`) склеивает массовую отметку в одну запись по одинаковому `watched_at`. `now` вычисляется один раз и идёт во все `UPDATE`
- **Серверный экшен** `markUpToEpisode(episodeId, includePreviousSeasons)` в `app/actions/progress.ts`. Сезон, номер серии и тайтл сервер берёт по `episodeId` сам, а не доверяет клиенту. RLS защищает от чужих серий
- **UI** — вторая иконка-кнопка в `EpisodeRow`, только для неотмеченных серий (для отмеченной операция ничего не сделает). На десктопе видна при наведении и `focus-visible`, на тач-устройствах всегда. Скрытие только от `md:` — через `md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100`
- **Выбор «этот сезон / всё до него»** — `AlertDialog` (`components/ui/alert-dialog.tsx`) показывается, только если в предыдущих сезонах есть неотмеченные серии. Иначе вопрос бессмысленный, и отметка идёт сразу. Проверка делается на клиенте по `episodeMap` — данные уже в памяти
- **Филлеры отмечаются вместе со всеми.** Ответ на открытый вопрос карточки: `markSeason` и `markAllTitle` их тоже не пропускают, а единообразное поведение важнее. Кто не смотрит филлеры, снимет их отдельно

## Checklist
- [ ] `lib/supabase/progress.ts`: `markEpisodesUpTo(client, { seasonId, episodeNumber, previousSeasonIds, watchedAt })`
  - `UPDATE episodes SET is_watched=true, watched_at=watchedAt WHERE season_id=seasonId AND episode_number<=episodeNumber AND is_watched=false`
  - если `previousSeasonIds.length > 0` — второй `UPDATE` с `.in('season_id', previousSeasonIds).eq('is_watched', false)`, тот же `watchedAt`
- [ ] `app/actions/progress.ts`: `markUpToEpisode(episodeId, includePreviousSeasons)`
  - одним запросом получить `episode_number, season_id, seasons!inner(season_number, media_item_id)`
  - при `includePreviousSeasons` — id сезонов этого тайтла с `season_number < текущего` (спешлы уже отфильтрованы при синке, `tmdb.service.ts:429`)
  - `const watchedAt = new Date().toISOString()` — один раз, передать в хелпер
  - `revalidatePath('/library')` — блок «Продолжить» зависит от прогресса (как в `watchNextEpisode`)
- [ ] `components/media/EpisodeRow.tsx`: новый проп `onMarkUpTo?: (episode: Episode) => void`; иконка `ListChecks` (lucide) в `<button>` с `aria-label="Отметить по эту серию включительно"` и `data-testid="episode-mark-up-to-${id}"`; к корневому `div` добавить `group`
- [ ] `components/media/SeasonAccordion.tsx`:
  - `handleMarkUpTo(season, episode, includePrevious)` — оптимистичное обновление `episodeMap` по образцу `handleMarkSeason` (`:70`): снимок `previousMap`, общий `now`, `withRetry`, откат и `toast.error` при ошибке
  - `requestMarkUpTo(season, episode)` — если в сезонах с меньшим `season_number` нет неотмеченных серий, сразу `handleMarkUpTo(..., false)`, иначе открыть диалог
  - стейт `pendingMarkUpTo: { season, episode } | null` и один `AlertDialog` на весь аккордеон. Кнопки: «Только сезон N», «Все сезоны до этого», «Отмена»
- [ ] `npm run build` и `npm run lint` — 0 ошибок
- [ ] Ручная проверка:
  - S1E05 в чистом сериале → отмечены E01–E05, диалога нет
  - S3E04 при неотмеченных S1–S2 → диалог; оба варианта работают, уже отмеченные серии сохраняют свою дату
  - после reload отметки на месте
  - `/stats` → лента показывает массовую отметку одной записью
  - мобильный вьюпорт → кнопка видна без наведения

## Risks / open questions
- **Статус тайтла не меняется.** Отметка S2E12 у тайтла со статусом `planned` оставит `planned`. Автосмена статуса — отдельная тема (идея 5 про «Просмотрено» при последней серии); сюда не тащим
- **Дата у отметки задним числом.** Бэк-каталог получит сегодняшний `watched_at` и попадёт в ленту и статистику за сегодня. Так же сейчас работают `markSeason` и `markAllTitle`, так что это не регрессия. Если это станет мешать, решать отдельно и сразу для всех массовых отметок
- **Плотность строки на мобильном.** В строке уже есть чекбокс, номер, название, бейдж филлера, длительность и дата. Если иконка сожмёт название до нечитаемого, на узком экране можно прятать длительность
