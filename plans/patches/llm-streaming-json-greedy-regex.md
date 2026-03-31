# Patch: LLM streaming JSON — greedy regex failure

**Date**: 2026-03-30
**Area**: api

## Problem
`JSON.parse` падал при парсинге рекомендаций из Groq-стрима. Симптом: карточки не приходили, в логах ошибка парсинга несмотря на то что LLM вернул валидный массив.

## Root Cause
Для извлечения JSON-массива из буфера использовался `/\[[\s\S]*\]/`. Жадный квантификатор `*` захватывает до **последнего** `]` в строке, а не до первого закрывающего. LLM периодически добавлял текст после массива — например `"Вот 5 фильмов [из вашего списка]"` — и последний `]` оказывался за пределами массива. `JSON.parse` падал с SyntaxError.

Баг воспроизводился нестабильно: зависел от конкретной модели и промпта, поэтому поначалу не был замечен.

## Solution
Заменили regex на `extractJsonArray()` — функцию с подсчётом глубины скобок и отслеживанием строкового контекста (`"`, `\`). Возвращает ровно первый полный массив, игнорируя всё после него.

```typescript
function extractJsonArray(text: string): string | null {
  const start = text.indexOf('[')
  if (start === -1) return null
  let depth = 0, inString = false, escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '[' || c === '{') depth++
    else if (c === ']' || c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  return null
}
```

## Prevention
- Никогда не использовать `regex` для извлечения JSON из LLM-вывода. LLM добавляет произвольный текст до и после JSON.
- Правило: **bracket-counting или `JSON.parse` в try/catch по всему буферу** — и то и другое лучше regex.
- Применимо везде, где парсится JSON из стрима или из поля `content` LLM-ответа.
