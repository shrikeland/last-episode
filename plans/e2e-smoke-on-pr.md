## Goal
На каждый PR гонять только смоук-набор Playwright (~2 мин вместо ~10), полный набор — на push в main.

## Approach
- Смоук-тесты помечаются встроенным тегом Playwright `{ tag: '@smoke' }` прямо в своих спеках — структура по областям не меняется
- `.github/workflows/e2e.yml`: на `pull_request` добавляется `--grep @smoke`, на `push` в main — полный прогон; имя джобы показывает режим
- `e2e/package.json`: скрипт `test:smoke` для локального прогона
- Документация: `e2e/README.md`, раздел Testing в `CLAUDE.md` / `AGENTS.md`

Смоук-набор (критичные пути + рендер основных страниц, без деструктивных и медленных тестов):
- Auth: TC-AUTH-001, TC-AUTH-004, TC-AUTH-011
- Library: TC-LIB-001, TC-LIB-006
- Search: TC-SEARCH-001, TC-SEARCH-004
- Media: TC-MEDIA-002, TC-MEDIA-003
- Страницы: TC-STATS-001, TC-REC-001, TC-COMM-001, TC-PROFILE-001

Вне смоука: TC-AUTH-010 (глобальный logout), TC-LIB-004 (удаление), auto-complete-status.spec (~4–5 мин), валидации форм, сортировка, scaffold-тесты.

## Checklist
- [x] Разметить 13 тестов тегом `@smoke`
- [x] Условный `--grep @smoke` в workflow
- [x] Скрипт `test:smoke`
- [x] Обновить README / CLAUDE.md / AGENTS.md
- [x] `npx playwright test --list --grep @smoke` → 13 тестов; `tsc --noEmit` чистый

## Risks / open questions
- Регрессия вне смоука ловится только после мержа (push в main) — осознанный компромисс
- concurrency-группа `e2e-production` остаётся общей: смоук тоже ходит в прод тем же юзером, а полный прогон делает глобальный logout
