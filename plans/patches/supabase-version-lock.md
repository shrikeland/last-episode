# Patch: Supabase version lock after TypeScript breakage

**Date**: 2026-03-17
**Area**: build | types

## Problem
После `npm install` supabase-js обновился до 2.99.x — сломались все TypeScript типы в `Database` generic. Ошибки повсюду в файлах, использующих `SupabaseClient<Database>`.

## Root Cause
`package.json` использовал `^2.x` (caret range), что позволило npm подтянуть мажорный-minor bump с breaking changes в типах. Supabase меняет типовые сигнатуры между minor версиями без предупреждения.

## Solution
Зафиксированы точные версии без caret:
- `@supabase/supabase-js`: `2.46.2` (без `^`)
- `@supabase/ssr`: `0.5.2` (без `^`)

Добавлена миграция `20260317100000_rating_half_stars.sql` для сопутствующего изменения схемы.

## Prevention
- При любом `npm install` — проверить что supabase пакеты остались на зафиксированных версиях
- Не использовать `^` для `@supabase/*` пакетов
- Перед обновлением supabase — отдельная ветка + полный `npm run build` + `npm run lint`
- `@supabase/ssr` несовместим с `supabase-js v3` — не обновлять до появления официального гайда по миграции