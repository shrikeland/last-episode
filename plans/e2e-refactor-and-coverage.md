# E2E: рефакторинг существующих тестов и покрытие основных пользовательских путей

## Context

В `e2e/` сейчас 11 спеков и примерно 57 тестов. Они ходят на прод (`www.episode.watch`) под одним тестовым аккаунтом. Последний раз набор писал автономный цикл `autotests-plans/` в мае 2026, и с тех пор он закрыт (`blocked: all-areas-complete`). После этого в приложение добавили много фич: «Продолжить просмотр», отметку «по эту серию», кликабельные жанры и статусы, обзор похожих тайтлов, «Друзья смотрят», «Общее с другом», профиль вкусов и таймлайн просмотров. Автотестов на них нет. Многие существующие тесты к тому же проверяют мало или ничего:

- **Проверки, которые проходят всегда.** TC-REC-001 (`main || h1`), TC-PROFILE-003 (`body` attached), TC-LIB-002 (`after ≤ before`).
- **Тест, ставший пустым.** TC-SEARCH-005+007 после первого прогона выходит через `return`: Severance уже в библиотеке.
- **Утечки состояния.** TC-MEDIA-002/003/004 меняют статус и отметки серий и не возвращают их обратно.
- **Хрупкость.** В POM и тестах стоят `waitForTimeout`, везде `networkidle`, `test.skip(!reachable)` дублируется около 50 раз, в каждом файле два `test` с двумя `beforeAll`, а сырые селекторы `[data-testid^=...]` написаны прямо в спеках.
- **Мусор и дубли.** Есть scaffold-тесты на `setContent` и 9 одинаковых тестов «гость → /login», разбросанных по 7 файлам.
- **Конфиг.** `npm test` гоняет chromium + firefox + webkit, хотя комментарий говорит, что они «disabled». `retries: 2` действует и локально.

Цель: надёжный, самоочищающийся набор, который после любой доработки показывает, что основные пользовательские пути работают. Глубокое тестирование (граничные случаи, визуальные и a11y-проверки) в задачу не входит.

**Решения пользователя:** для социальных сценариев заводим **второй тестовый аккаунт**; AI-рекомендации проверяем через **мок стрима `page.route`**.

После одобрения план копируется в репо как `plans/e2e-refactor-and-coverage.md` (по правилам CLAUDE.md).

---

## Сквозные правила для всех агентов (чек-лист ревью техлида)

1. **Локаторы.** Сначала `getByRole` / `getByLabel` / `getByText`, существующие `data-testid` можно. В спеках нет сырых `[data-testid^=…]`: такие локаторы живут в POM.
2. **Ожидания.** Запрещены `waitForTimeout` и `networkidle`. Нужно ждать web-first assertions или ответ server action (хелпер `waitForServerAction`, см. часть A).
3. **Изоляция данных.** Тест, который меняет данные, либо работает на своём **одноразовом тайтле** (фикстура `throwawayTitle` добавляет его и удаляет в teardown), либо возвращает исходное состояние в `finally` / фикстуре. Не проверять точное общее число карточек в библиотеке: параллельные прогоны других агентов добавляют свои тайтлы.
4. **Каждому агенту свой одноразовый тайтл** (реестр в `support/test-data.ts`). Агенты не трогают чужие тайтлы.
5. **Безопасность.** Не использовать `context.request` с авторизованным контекстом: при таймауте cookie попадает в публичный лог (см. память `e2e-ci-account-and-log-leaks`). Username не хардкодить, брать из сессии.
6. **ID и теги.** ID тестов в формате `TC-<AREA>-NNN`, новые номера продолжают существующие. `@smoke` ставится только на быстрые критичные тесты, которые не разрушают данные. Финальный список смоука утверждает техлид.
7. **Код приложения** (новые `data-testid` / `aria-label`) правим только если без этого никак. Такие правки идут **отдельным PR, который мержится и деплоится до тестов**: CI гоняет тесты на проде, а не на превью PR. В этом PR обязательны `npm run build` и `npm run lint`.
8. **Готовность части:** `npx tsc --noEmit` в `e2e/` чистый; спеки части зелёные на `--repeat-each=3` против прода; полный набор после части не сломан; README / таблица покрытия обновлены.

---

## Часть A — фундамент (первой, один агент, блокирует остальные)

**Цель:** новая инфраструктура, на которую существующие спеки переводятся механически, без изменения логики. После части A набор остаётся зелёным.

**Файлы:** `e2e/playwright.config.ts`, `e2e/fixtures/*`, `e2e/support/*`, `e2e/tests/setup/*` (новые), `e2e/tests/guest/guards.spec.ts` (новый), `.github/workflows/e2e.yml`, `e2e/README.md`, `e2e/.env.example`, импорты во всех спеках.

1. **Проекты Playwright** (паттерн setup + dependencies):
   - `setup`: `auth.setup.ts` логинится через UI под user и friend и пишет `e2e/.auth/user.json` и `.auth/friend.json` (добавить в `.gitignore`). `seed.setup.ts` переносит `ensureLibrarySeeded` из worker-фикстуры.
   - `guest`: `tests/guest/**`, без storageState.
   - `user`: все остальные спеки, `storageState: .auth/user.json`, `dependencies: ['setup']`. Обычный `page` уже авторизован, фикстура `authenticatedPage` больше не нужна.
   - `logout`: `tests/auth/logout.spec.ts` (TC-AUTH-010), `dependencies: ['user']`. Глобальный signOut выполняется последним и больше не ломает чужие сессии. Логику `isSessionValid` / перелогина убрать.
   - firefox и webkit убрать из `projects`: в `npm test` они не нужны.
2. **Убрать проверку доступности по тестам.** Удалить `support/network.ts`, все `test.skip(!reachable)`, `beforeAll` и двойные `test`. Единственным гейтом остаётся `global-setup.ts`; локально он тоже должен падать, а не только предупреждать. Удалить `support/env.ts`, если он не используется (`FALLBACK_URL` из `.env.example` тоже).
3. **Единый `fixtures/index.ts`** через `test.extend`:
   - POM-фикстуры: `libraryPage`, `searchPage`, `mediaPage`, `navbar`, `loginPage`, `registerPage`, а также **заглушки** `statsPage`, `communityPage`, `profilePage`, `recommendationsPage` (пустые классы в `pages/`). Тогда части B–F правят только свои файлы POM и не конфликтуют в реестре фикстур.
   - `friendPage`: контекст со storageState второго пользователя (multi-user).
   - `throwawayTitle(key)`: добавляет тайтл из реестра через UI поиска, отдаёт `{ mediaUrl, title }` и удаляет его в teardown через UI библиотеки. Основа — существующие `SearchPage.ensureAdded` и `LibraryPage.deleteFirstCard` (с фильтром по названию).
4. **`support/test-data.ts`**: `SEED_TITLES` (переезжает из `seed.ts`) и реестр одноразовых тайтлов с ключом по части (`library`, `media`, `recs`, `social`, `stats`), у каждого `kind + tmdbId`. Конкретные TMDB-тайтлы выбирает агент A и проверяет их поиском.
5. **`support/actions.ts`**: `waitForServerAction(page, trigger)` (POST + `next-action` header) вместо `waitForTimeout`. Обобщает `MediaPage.clickAndSave`.
6. **`tests/guest/guards.spec.ts`**: один параметризованный тест «гость → /login» для `/library /search /stats /recommendations /community /profile/x /media/<uuid>`. Вместо 9 разрозненных тестов (TC-AUTH-004/004b, LIB-007, MEDIA-006, SEARCH-008, STATS-002, COMM-003, REC-003, PROFILE-002). Тест на `/library` с тегом `@smoke`. Туда же переезжают гостевые тесты из `auth.spec.ts` (login / register / callback).
7. **Удалить** `tests/smoke.spec.ts`: scaffold-тесты ничего не проверяют, а integration-тесты дублируют guards.
8. **Конфиг:** `retries: isCI ? 2 : 0`; `trace: isCI ? 'off' : 'retain-on-failure'`, `video` так же (публичный репо, трейсы содержат cookie), скриншоты оставить; `globalTimeout` 25 мин.
9. **CI** (`e2e.yml`): `TEST_USER2_EMAIL` / `TEST_USER2_PASSWORD` из environment Production; `timeout-minutes: 30`; `--project=chromium` заменить на запуск проектов `setup`, `guest`, `user` и `logout` (на PR с `--grep @smoke`; `setup` должен запускаться и тогда). Проверить, что при `--grep @smoke` setup-проекты не отфильтровываются, иначе пометить их тегом.
10. README: новая структура, проекты, второй пользователь, правила из раздела выше.

**Предусловие от пользователя (до старта A):** зарегистрировать на `episode.watch` второй тестовый аккаунт, подтвердить почту, положить `TEST_USER2_EMAIL` / `TEST_USER2_PASSWORD` в GitHub → Environments → Production и в локальный `e2e/.env`. Для CI-юзера и локального нужны разные пары, как сейчас.

---

После A части B–F работают **волнами**: тестовый аккаунт общий, и одновременные прогоны против прода мешают друг другу.
**Волна 1 (параллельно): B, D, E. Волна 2 (параллельно): C, F.** Каждый агент работает в своём worktree и правит только свои спеки и свои POM.

## Часть B — библиотека и поиск

**Свои файлы:** `tests/library/*`, `tests/search/*`, `pages/LibraryPage.ts`, `pages/SearchPage.ts`.

Рефакторинг:
- Убрать `waitForTimeout` из `search()` и `filterByText()`: ждать результатов, URL или ответа.
- TC-LIB-002: проверять, что после фильтра карточек 0 и показан EmptyState «Сбросить фильтры», а не `≤`.
- TC-SEARCH-005+007 и TC-LIB-004 объединить в один **lifecycle-тест** на `throwawayTitle('library')`: поиск → «Добавить» → выбор статуса в диалоге → тост → «Добавлено» → тайтл в `/library` с этим статусом → удаление → карточки нет. Severance больше не используется.
- TC-LIB-005 / TC-LIB-006 / TC-LIB-SORT-* перевести на фикстуры, без сырых селекторов.

Новые сценарии:
- **Фильтры реально фильтруют:** статус (сид-тайтл со статусом X виден, с другим статусом не виден), тип `tv` показывает только «Чернобыль» из сидов, жанр, оценка «Без оценки», сброс через «Сбросить фильтры» и счётчик `library-found-count`.
- **Изменение на странице тайтла видно в библиотеке после «Назад»** (`RefreshIfStale`, пункт ручного чек-листа CLAUDE.md): сменить статус → back-button → карточка в нужной секции или фильтре. Выполнять на одноразовом тайтле.
- **«Продолжить просмотр»:** у сериала со статусом «Смотрю» и частичным прогрессом есть карточка `continue-card-*`, клик `continue-mark-*` двигает счётчик серии. Нужен свой сериал; в реестре можно завести одноразовый сериал для `library`.
- Поиск: смена запроса заменяет результаты; карточка результата открывает диалог с правильным названием.

## Часть C — страница тайтла и трекинг серий

**Свои файлы:** `tests/media/*`, `pages/MediaPage.ts`.

Рефакторинг:
- TC-MEDIA-002/003/004 перевести на `throwawayTitle('media')` (сериал с 1–2 сезонами): тогда утечки состояния нет. TC-MEDIA-004 проверяет **все** чекбоксы сезона, а не первые 3.
- `auto-complete-status.spec`: заменить `waitForTimeout(1500)` на ожидание ответа server action и проверку отсутствия тоста. Если тайминги позволяют, перевести на одноразовый сериал вместо «Чернобыля» и убрать восстанавливающий `afterAll`.
- Из `MediaPage` убрать `waitForTimeout` (changeStatus, openFirstSeasonAccordion, markFirstSeasonWatched, editNotes).

Новые сценарии (у каждого проверка **после reload**, это пункт ручного чек-листа):
- Отметка серии сохраняется после перезагрузки; снятие отметки тоже.
- Оценка: поставить, reload, значение на месте; сбросить.
- Заметки: ввести, blur или сохранение, reload, текст на месте.
- «Отметить по эту серию» (`episode-mark-up-to-*`): диалог `mark-up-to-dialog` → «только этот сезон» / «все предыдущие» дают правильные отметки.
- «Отметить всё» (`mark-all-title-button`) → индикатор `title-watched-indicator`.
- Ссылка жанра `media-genre-link` ведёт в `/library?genre=…` с отфильтрованным списком; back-button возвращает назад.
- Похожие тайтлы (`TitleRecommendations`): открыть обзор (`RelatedTitleDialog`) → видно описание → «Добавить» → кнопка «В библиотеке» / переход. Добавленный тайтл удаляется в `finally`.
- Несуществующий `/media/<uuid>` показывает страницу 404 без падения.

## Часть D — статистика, навигация, аккаунт

**Свои файлы:** `tests/stats/*`, `tests/navigation/*` (новый), `tests/auth/*` (кроме гостевых, уехавших в A), `tests/profile/own-profile.spec.ts`, `pages/StatsPage.ts`, `pages/NavbarPage.ts`.

- **Статистика считает верно** (P1 из CLAUDE.md). Дельта-тест на `throwawayTitle('stats')`: запомнить счётчик статуса в `StatsBreakdown`, добавить тайтл с этим статусом, reload, получить +1; после удаления счётчик возвращается. Точные абсолютные числа не проверять.
- Ссылки `stats-status-link` / `stats-genre-link` открывают библиотеку с соответствующим фильтром и непустым списком.
- `watch-timeline` рендерится с `watch-timeline-summary`.
- **Навигация:** один тест обходит все 5 пунктов AppDock («Библиотека», «Найти», «Статистика», «Для тебя», «Сообщество»): правильный URL и заголовок страницы. Логотип ведёт в `/library`, меню аккаунта — в свой профиль. Тег `@smoke`.
- **Auth:** залогиненный пользователь на `/login` и `/register` редиректится в `/library` (правило `proxy.ts`). Существующие TC-AUTH-001/002/003 и проверки валидации регистрации оставить, переведя на фикстуры.
- Свой профиль (TC-PROFILE-001): заголовок `@username`, статистика, секции библиотеки с сид-тайтлами. TC-PROFILE-003 переписать на конкретную проверку 404.

## Часть E — AI-рекомендации (с моком)

**Свои файлы:** `tests/recommendations/*`, `pages/RecommendationsPage.ts`, `fixtures/recommendations.mock.ts` (новый; регистрируется через заглушку из A).

- Мок `POST /api/recommendations/generate` через `page.route`: тело — интро-текст, `\n__INTRO_DONE__\n`, затем `\n__CARDS__:` и JSON из 5 карточек в формате `RecommendationCardData` (`types/recommendations.ts`). Протокол см. в `components/recommendations/RecommendationsPage.tsx`. Одна карточка — реальный TMDB-тайтл из реестра (`recs`), чтобы добавление работало через настоящий server action.
- Мок `POST /api/recommendations/profile` для «Обновить профиль».
- Сценарии:
  1. Анкета: пройти шаги Stepper (тип → настроение → исключения → знакомство) → отправить → видны интро, затем `recommendation-skeletons`, затем 5 карточек `recommendation-card`. Тег `@smoke`.
  2. Карточка → детальный диалог → «Добавить» (`recommendation-add-button`) → тайтл есть в библиотеке; удаление в teardown.
  3. Ошибка генерации: мок 500 → тост «Не удалось получить рекомендации» → снова анкета.
  4. `new-questionnaire-button` сбрасывает результаты к анкете.
  5. Профиль вкусов: `taste-profile-toggle` раскрывает `taste-profile-summary`; «Обновить» с моком показывает тост «Профиль вкусов обновлён».
- Убрать слабые TC-REC-001/002.

## Часть F — социальные сценарии (два пользователя)

**Свои файлы:** `tests/social/*` (новый; `tests/community/*` переезжает сюда), `pages/CommunityPage.ts`, `pages/ProfilePage.ts`.

- `describe.configure({ mode: 'serial' })`. В `beforeAll` привести дружбу user ↔ friend к «нет связи» через UI (удалить друга или отменить заявку). В `afterAll` — так же, чтобы набор был идемпотентным.
- У friend в сиде есть хотя бы один общий с user тайтл: сидить через `seed.setup.ts`, добавив friend в A, или здесь в `beforeAll`. Решение за агентом F, согласовать с техлидом.
- Сценарии:
  1. **Заявка и отклонение:** user ищет friend на `/community` → «Добавить» → «Отправлено»; friend видит входящую заявку и отклоняет; у user кнопка снова «Добавить».
  2. **Отмена исходящей заявки** user'ом.
  3. **Заявка и принятие:** обе стороны видят друг друга в списке друзей.
  4. **Профиль друга:** `/profile/<friend>` показывает библиотеку и блок `common-titles` / `common-watched` с общим тайтлом.
  5. **«Друзья смотрят»** на странице общего тайтла у user: friend в списке → ссылка ведёт на `/profile/<friend>/media/<id>` (read-only прогресс, `ProfileAddToLibraryControl`).
  6. **Удаление из друзей** (заодно cleanup).
- Существующие TC-COMM-001/002 перевести на фикстуры.
- Если для кнопок UserCard и IncomingRequests не хватает доступных имён (на мобильной ширине текст `hidden sm:inline`), нужен отдельный app-PR с `aria-label`. До деплоя этого PR тестов F нет (правило 7).

## Часть G — финальная сборка (техлид)

- Утвердить финальный список `@smoke` (около 15–20 тестов, ≤3 мин): логин, guard, рендер библиотеки, переход на тайтл, смена статуса, отметка серии, поиск с диалогом, навигация, рекомендации с моком, рендер сообщества и профиля.
- Полный прогон 2 раза подряд на прод: зелёный, время ≤ 20 мин. Сравнить сводку библиотеки тестового аккаунта до и после: одноразовых тайтлов остаться не должно.
- Обновить раздел Testing в `CLAUDE.md` и `AGENTS.md` (таблицу тестов, проекты, второго пользователя). В `autotests-plans/` добавить пометку «superseded by plans/e2e-refactor-and-coverage.md»; удаление этой папки и команды `/e2e-cycle` — только с согласия пользователя.

---

## Как я провожу ревью каждой части

1. Агент сдаёт ветку и короткий отчёт: что сделано, какие тесты появились, вывод прогона `--repeat-each=3`.
2. Я делаю `/code-review` диффа и прохожу сквозной чек-лист (правила 1–8).
3. Сам прогоняю спеки части: `npx playwright test <paths> --project=user --repeat-each=3` и `npx tsc --noEmit`. Проверяю, что после прогона в библиотеке нет следов.
4. Замечания возвращаю тому же агенту (SendMessage), повторяю цикл до чистого ревью и мержу ветку части в общую ветку.

## Verification (итог)

```bash
cd e2e && npx tsc --noEmit
npx playwright test --list                       # структура проектов, ~70–80 тестов
npx playwright test --grep @smoke               # ≤ 3 мин
npx playwright test                              # полный, ≤ 20 мин, 0 failed, 0 skipped
```
CI: открыть PR и убедиться, что смоук зелёный и `skipped = 0`; после мержа зелёный полный прогон на push в main.

## Risks / open questions

- **Общий аккаунт и прод.** Параллельные агенты и CI мешают друг другу. Отсюда волны, у каждого свой одноразовый тайтл и `concurrency: e2e-production` в CI. Пока идёт работа агентов, не мержить в main, чтобы полный прогон CI не шёл одновременно с их прогонами.
- **Новые testid в приложении** появляются только после деплоя: такие правки отдельным PR заранее.
- **Время полного прогона** растёт. Если не уложимся в 20 мин, вынести read-only тесты (guest, stats, навигация) в параллельные воркеры.
- **Публичные артефакты CI:** трейсы выключены в CI. Если для отладки понадобятся, включать только локально.
- **Следующий шаг вне этого плана:** гонять PR-смоук на Vercel preview вместо прода.

---

## Status (2026-10-08)

- [x] A — foundation (`5aaa432`)
- [x] B — library & search
- [x] C — title page & episode tracking
- [x] D — stats, navigation, account
- [x] E — AI recommendations (mocked)
- [x] F — social, two users
- [x] G — smoke list (16 tests + setup/seed, ~1 min locally), README, CLAUDE.md / AGENTS.md, autotests-plans marked superseded

Result: 86 tests in 21 files; full suite green twice in a row against prod (5.4 / 6.6 min), smoke 57 s,
no throwaway titles left in the library. Found during the work (app, not fixed here): status change
unticks a just-ticked episode in the UI (revalidatePath re-render), intro lost if the recommendation
stream arrives in one chunk, no custom 404 (HTTP 200 + Next default page), friend request from the
other side creates a second pending row instead of accepting, friend actions have no error rollback,
dock and friend buttons lack a permanent accessible name.
