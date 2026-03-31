# Patch: RLS для двусторонних отношений (friendship-паттерн)

**Date**: 2026-03-30
**Area**: db

## Problem
При реализации заявок в друзья: получатель не мог видеть входящие заявки — Supabase возвращал пустой массив. RLS молча резал строки без ошибки.

## Root Cause
Таблица `friendships` хранит запись как `(user_id=A, friend_id=B)`. Первый инстинкт — написать `USING (user_id = auth.uid())` для SELECT. Это работает для отправителя (A), но получатель (B) стоит в `friend_id` — его запрос возвращает ноль строк. Supabase RLS не бросает ошибку, просто фильтрует, из-за чего баг выглядит как "нет данных" вместо "нет доступа".

## Solution
```sql
-- SELECT: оба участника видят запись
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- UPDATE: только получатель может принять заявку
CREATE POLICY "Recipients can accept requests"
  ON public.friendships FOR UPDATE
  USING (friend_id = auth.uid())
  WITH CHECK (friend_id = auth.uid() AND status = 'accepted');

-- DELETE: оба могут отменить/отклонить/удалить
CREATE POLICY "Users can cancel or decline"
  ON public.friendships FOR DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());
```

В server action `removeFriend` — запрос тоже должен охватывать обе стороны:
```typescript
.or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
```

## Prevention
- Любая таблица, где запись описывает **отношение между двумя пользователями** (friends, blocks, follows, DMs) — SELECT-политика должна включать **обе стороны**: `user_id = auth.uid() OR other_id = auth.uid()`.
- При отладке "пустого результата" из Supabase — первым делом проверяй RLS через `explain` или Supabase Dashboard → Table Editor → RLS preview.
- Паттерн `OR` в RLS может быть медленным на большой таблице — добавляй индекс на оба FK-поля.
