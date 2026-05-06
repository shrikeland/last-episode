# Task Plan: Доработки библиотеки, поиска и карточек

## Goal
Реализовать 10 доработок из пользовательского списка и довести проект до проходящих `npm run build` и `npm run lint`.

## Status
- Phase 1: Explore repository — complete
- Phase 2: Write implementation spec — complete
- Phase 3: Dispatch agents — complete
- Phase 4: Integrate changes — complete
- Phase 5: Verify build/lint — complete
- Phase 6: Commit own changes only — complete

## Checklist
- [x] Прочитать `CLAUDE.md` и проектные инструкции.
- [x] Найти файлы библиотеки, поиска, деталей тайтла, профилей и прогресса.
- [x] Зафиксировать общий план и разбиение по агентам в `PLAN.md`.
- [x] Запустить агентов A-C с непересекающимися основными зонами ответственности.
- [x] Проверить diff каждого агента и устранить конфликты.
- [x] Выполнить `npm run build`.
- [x] Выполнить `npm run lint`.
- [x] Создать commit только с изменениями по задаче.

## Risks / Open Questions
- В git уже есть чужие staged deletion; не включать их в финальный commit.
- `PLAN.md` был в staged deletion до этой работы, но пользователь явно попросил план в `PLAN.md`, поэтому файл восстановлен как часть текущей задачи.
- Cast должен работать без миграции и без падения при недоступном TMDB.

## Errors Encountered
| Error | Attempt | Resolution |
| --- | --- | --- |
| zsh glob error for `app/(app)/library/page.tsx` | Read path without quotes | Re-read with quoted path |
| Turbopack sandbox panic: `Operation not permitted` while binding to a port | `npm run build` inside sandbox | Re-ran `npm run build` with approved escalation; build passed |
| Sandbox blocked `.git/index.lock` creation | `git add` in default sandbox | Re-ran scoped `git add` with approved escalation |
