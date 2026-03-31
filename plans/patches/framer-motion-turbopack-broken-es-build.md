# Patch: framer-motion broken ES build with Turbopack

**Date**: 2026-03-31
**Area**: build

## Problem

При добавлении `framer-motion` в клиентские компоненты сборка `npm run build` (Turbopack) падала с ~50–130 ошибками вида:

```
Module not found: Can't resolve '../animation/animators/MainThreadAnimation.mjs'
Module not found: Can't resolve '../../../projection/node/state.mjs'
Module not found: Can't resolve '../../../context/LayoutGroupContext.mjs'
```

Turbopack следует `"import"` условию из `package.json exports` → попадает в `dist/es/index.mjs` → тот re-exports из отдельных `.mjs` файлов → многие из них отсутствуют в опубликованном пакете.

## Root Cause

`framer-motion` публикует несколько версий с неполным ES-билдом:

| Версия | Проблема |
|--------|----------|
| **11.13.x** | Отсутствует `projection/node/state.mjs` |
| **11.18.x** | Отсутствует вся директория `animation/animators/` |

Это upstream-баг публикации — barrel-файл `dist/es/index.mjs` ссылается на поддиректории, которые не включены в tarball. CJS-билд (`dist/cjs/index.js`) при этом полный и рабочий — это единый bundled-файл.

Попытки обойти через `transpilePackages` и `turbopack.resolveAlias` / `webpack alias` результата не дали: `turbopack.resolveAlias` не влияет на внутренние относительные импорты внутри самого пакета.

**Рабочая версия**: `11.14.4` — имеет полный ES-билд со всеми поддиректориями.

## Solution

```bash
npm install framer-motion@11.14.4 motion-dom@11.14.3 --legacy-peer-deps
```

`motion-dom` нужно зафиксировать тоже — `framer-motion@11.14.4` требует `^11.14.3`, а npm может установить более новую сломанную версию.

В `package.json` результирующие версии:
```json
"framer-motion": "11.14.4",
"motion-dom": "11.14.3"
```

## Prevention

- **Никогда не обновлять `framer-motion` выше `11.14.4`** без предварительной проверки ES-билда — запустить `npm run build` и убедиться в отсутствии ошибок `Module not found` из `dist/es/`.
- Перед обновлением проверять: `curl -s <tarball-url> | tar -tz | grep "animation/animators"` — если пусто, версия сломана.
- `turbopack.resolveAlias` и `transpilePackages` **не являются** рабочим способом исправить сломанный ESM-билд в пакете — они не переопределяют относительные импорты внутри `node_modules`.
- `motion-dom` нужно фиксировать вместе с `framer-motion` — их мажорные минорные версии должны совпадать.