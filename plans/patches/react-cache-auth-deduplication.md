# Patch: React.cache() для дедупликации auth.getUser()

**Date**: 2026-04-01
**Area**: auth

## Problem

`supabase.auth.getUser()` вызывался многократно на каждый запрос:

- `(app)/layout.tsx` — 1 раз напрямую
- Каждый page-компонент (library, stats, media, recommendations) — ещё по 1 разу
- Каждый server action (friends.ts имеет 9 функций, users.ts — 3) — ещё по 1 разу каждый

На странице `/community`: `Promise.all([getRecentUsers, getMyFriends, getPendingRequests, getPendingOutgoingIds])` — **5 отдельных `auth.getUser()` вызовов** за одно HTTP-обращение (1 в layout + 4 в server actions).

Каждый вызов — это отдельный сетевой round-trip к Supabase Auth API.

## Root Cause

Паттерн "создать клиент → вызвать getUser()" повторялся в каждой функции как независимый блок. Не очевидно, что все эти вызовы происходят в пределах одного React render-дерева и могут быть дедуплицированы.

В Next.js App Router: layout + page + server actions, вызванные из серверных компонентов через `Promise.all`, выполняются в одном контексте рендера. `React.cache()` создаёт per-request кэш, который переживает все вызовы внутри одного render-дерева.

## Solution

Добавлен `getServerUser()` в `lib/supabase/server.ts`:

```typescript
import { cache } from 'react'

export const getServerUser = cache(async () => {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
```

Все pages и server actions заменили `supabase.auth.getUser()` на `await getServerUser()`.

На `/community` результат: 5 auth-вызовов → 1 (первый делает сетевой запрос, остальные 4 — cache hit).

**Важно**: API routes (`/api/*`) оставлены без изменений — каждый route handler — отдельный HTTP-запрос, `React.cache()` там не кэширует между вызовами.

## Prevention

- При добавлении любой новой server action с auth-проверкой: использовать `getServerUser()` из `lib/supabase/server.ts`, не `supabase.auth.getUser()` напрямую.
- `React.cache()` работает в: Server Components, Server Actions вызванных серверно, Middleware (ограниченно).
- `React.cache()` НЕ помогает в: API Route Handlers, Server Actions вызванных с клиента (каждый — отдельный HTTP-запрос).
- Barrel-правило: `createServerClient` для запросов к БД, `getServerUser` для auth — не мешать.
