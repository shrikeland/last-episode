## Goal
Сделать так, чтобы после подтверждения почты пользователь действительно видел `/email-confirmed`, а при неудачном подтверждении получал понятную ошибку на `/register`.

## Root cause
`proxy.ts` смешивает «публичные» и «только для гостей» страницы в одном `isAuthPage`. `/auth/callback` вызывает `exchangeCodeForSession` → у пользователя появляется сессия → proxy видит `user && isAuthPage` на `/email-confirmed` и редиректит на `/library`. Страница недостижима. Задумка (Unit 8, BR-4 в `3bb5efd`): страница публичная, «т.к. сессия только что создана».

Рядом: callback при ошибке шлёт на `/register?error=confirmation_failed`, но страница регистрации параметр не читает — пользователь молча видит пустую форму (типичный случай: ссылка открыта в другом браузере/на телефоне, PKCE code verifier отсутствует).

## Approach
- `proxy.ts`: `/email-confirmed` пропускается для всех (без редиректа в обе стороны), убрать его из `isAuthPage`. Session refresh по-прежнему через `supabaseResponse`.
- `app/(auth)/email-confirmed/page.tsx`: ссылку «авторизоваться → /login» заменить на «перейти в библиотеку → /library». С сессией — сразу в библиотеку; без сессии proxy отправит на `/login`.
- `app/(auth)/register/page.tsx`: читать `searchParams.error` (через `use()` — страница клиентская) и при `confirmation_failed` показывать inline-ошибку в существующем `register-form-error`.
- CLAUDE.md / AGENTS.md: в Auth Flow `/email-confirmed` вынести из списка guest-only страниц.

## Checklist
- [x] Воспроизвести: harness с мок-Supabase вызывает `proxy()` → `signed-in /email-confirmed -> /library` (FAIL)
- [x] Фикс `proxy.ts`, harness проходит все 8 кейсов
- [x] Текст/ссылка на `/email-confirmed`
- [x] Ошибка `confirmation_failed` на `/register`, проверить в dev-сервере
- [x] Auth Flow в CLAUDE.md + AGENTS.md
- [x] `npm run build` + `npm run lint`

## Risks / open questions
- `/auth/*` остаётся guest-only: залогиненный пользователь, открывший ссылку подтверждения, уйдёт на `/library` без обмена кода. Почта при этом уже подтверждена на стороне Supabase, так что вреда нет — не трогаем.
- Полный e2e (реальное письмо) не прогнан: нужен тестовый аккаунт. Логика proxy проверена harness'ом, UI — в dev-сервере.
