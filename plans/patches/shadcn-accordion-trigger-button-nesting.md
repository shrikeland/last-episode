# Patch: shadcn AccordionTrigger — кнопка внутри кнопки

**Date**: 2026-03-30
**Area**: ui

## Problem
В `SeasonAccordion` рядом со стрелкой-тоггл нужно было поместить кнопку "Отметить все эпизоды". Кнопка не работала стабильно: клики терялись, а chevron-иконка иногда срабатывала вместо кнопки.

## Root Cause
Shadcn-компонент `AccordionTrigger` рендерит `<button>` под капотом (через Radix `AccordionPrimitive.Trigger`). Вложить `<button>` внутрь другого `<button>` — невалидный HTML. Браузер тихо "поднимает" вложенную кнопку в DOM, ломая layout и обработчики событий. Баг проявлялся нестабильно в зависимости от браузера.

## Solution
Заменили shadcn-обёртку `AccordionTrigger` на headless `AccordionPrimitive.Trigger` из `@radix-ui/react-accordion`. Это даёт тот же функционал без рендера `<button>` — контейнер становится `<h3>` с `role="button"`, внутрь которого `<button>` класть корректно.

```tsx
import * as AccordionPrimitive from '@radix-ui/react-accordion'

// Вместо:
<AccordionTrigger>...</AccordionTrigger>

// Использовать:
<AccordionPrimitive.Header>
  <AccordionPrimitive.Trigger className="...">
    {/* chevron */}
  </AccordionPrimitive.Trigger>
  <button onClick={markAll}>Отметить все</button>
</AccordionPrimitive.Header>
```

## Prevention
- Любой shadcn-компонент, рендерящий интерактивный элемент (`AccordionTrigger`, `SelectTrigger`, `DialogTrigger`, ...) — **нельзя вкладывать внутрь другой кнопки/ссылки**.
- Если нужно добавить action рядом с таким триггером — выноси action за пределы триггера или используй headless Primitive.
- Проверяй HTML в DevTools: `button > button` в Elements — признак этой проблемы.
