# autotests-plans/

> **Superseded (2026-10-08).** Автономный цикл закрыт ещё в мае 2026 (`blocked: all-areas-complete`), а
> его описание набора устарело. Актуальный план и структура E2E — [plans/e2e-refactor-and-coverage.md](../plans/e2e-refactor-and-coverage.md)
> и [e2e/README.md](../e2e/README.md). Папка и команда `/e2e-cycle` оставлены до решения об удалении.

Source of truth для **автономного процесса написания E2E тестов**. Эта папка читается:

1. **Тобой (человеком)** — чтобы видеть где сейчас находится scheduled-agent, что сделано, что запланировано.
2. **Scheduled-agent'ом** — чтобы определить следующую фазу и записать в git результаты работы.

## Карта папки

```
autotests-plans/
├── README.md                 ← вы здесь
├── glossary.md               ← терминология (фазы, статусы, скиллы)
├── driver-playbook.md        ← длинные инструкции, которые агент читает на каждом запуске
├── coverage-roadmap.md       ← создаётся агентом в фазе GLOBAL_EXPLORE
├── state/
│   └── cycle-state.json      ← оркестровка: текущая фаза/область/очередь/blocked
└── areas/<area-name>/        ← одна папка на область приложения, заполняется агентом
    ├── 01-exploration.md
    ├── 02-test-cases.md
    ├── 03-locator-audit.md
    ├── 04-implementation.md
    └── 05-coverage-matrix.md
```

## Как проверить прогресс

1. Открой `state/cycle-state.json`:
   - `active.area` и `active.phase` — что агент делает прямо сейчас.
   - `queue` — оставшиеся области.
   - `completed_areas` — области с merged PR'ами.
   - `blocked` — если не `null`, агент остановился и ждёт тебя. Прочти `blocked.reason`.

2. Посмотри последний коммит на ветке `e2e/autotests`.

3. Открой `coverage-roadmap.md` для общей карты покрытия.

## Ручной запуск итерации

`/e2e-cycle` (slash-команда в Claude Code, в корне репо) — выполнить ОДНУ фазу локально, не дожидаясь следующего scheduled-тика.

## Где лежат сами тесты

В папке `e2e/` в корне репо (отдельный package, свой `playwright.config.ts`). Эта папка пустая до тех пор, пока scheduled-agent не выполнит фазу SCAFFOLD.

## Спецификация

Полный дизайн процесса: [docs/superpowers/specs/2026-05-26-autonomous-e2e-setup-design.md](../docs/superpowers/specs/2026-05-26-autonomous-e2e-setup-design.md).
