# Unit 11 — AI Recommendations: Code Generation Plan

**Unit**: AI Recommendations
**Route**: `/recommendations`
**Workspace Root**: `/Users/hornysennin/Desktop/projects/last-episode`

---

## Unit Context

**Цель**: Страница персонализированных рекомендаций от LLM (Groq).
**Зависимости**:
- `lib/supabase/media.ts` — `getMediaItems()` для загрузки библиотеки
- `lib/supabase/server.ts` — серверный клиент Supabase
- `lib/tmdb/tmdb.service.ts` — `search()` для TMDB-обогащения карточек
- `components/Navbar.tsx` — добавление нового пункта навигации
- Supabase `media_items` table — источник данных для pre-summary

**Новые артефакты**:
- Таблица `taste_profiles` (Supabase)
- `lib/groq/groq.service.ts`
- 2 API routes
- 5 компонентов рекомендаций
- 1 страница (Server Component)

---

## Steps

### Step 1: DB Migration — taste_profiles
- [x] Создать `supabase/migrations/20260324000000_taste_profiles.sql`
- Таблица: `taste_profiles (id, user_id, summary TEXT, updated_at)`
- UNIQUE constraint на `user_id` (один профиль на пользователя)
- RLS политики: select/insert/update/delete по `auth.uid() = user_id`

---

### Step 2: Groq Service
- [x] Создать `lib/groq/groq.service.ts`
- Fetch-based (без SDK, не ставить groq npm пакет — используем нативный fetch)
- Функция `generateStream(systemPrompt, userPrompt)` → `ReadableStream`
- Функция `generate(systemPrompt, userPrompt)` → `string` (без стриминга, для pre-summary)
- Модель: `llama-3.3-70b-versatile`
- API key: `process.env.GROQ_API_KEY`
- Базовый URL: `https://api.groq.com/openai/v1/chat/completions`

---

### Step 3: API Route — Profile Generation
- [x] Создать `app/api/recommendations/profile/route.ts`
- Метод: `POST`
- Auth: проверка пользователя через `createServerClient()`
- Загружает все `media_items` пользователя через `getMediaItems()`
- Формирует промпт для Groq (анализ вкусов)
- Вызывает `groq.service.ts` → `generate()` (без стриминга)
- Сохраняет/обновляет результат в `taste_profiles` (upsert по user_id)
- Возвращает `{ summary, updated_at }`
- Обработка ошибок: нет GROQ_API_KEY → 500, < 5 тайтлов → 400

---

### Step 4: API Route — Recommendations Generation (Streaming)
- [x] Создать `app/api/recommendations/generate/route.ts`
- Метод: `POST`, body: `{ questionnaire: { contentType, mood, exclusions, familiarity } }`
- Auth: проверка пользователя
- Загружает `taste_profiles` для пользователя из Supabase
- Если профиль не найден → 400 `{ error: 'no_profile' }`
- Формирует промпт с профилем + анкетой
- Вызывает `groq.service.ts` → `generateStream()`
- Проксирует streaming ответ клиенту через `new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`

---

### Step 5: RecommendationCard Component
- [x] Создать `components/recommendations/RecommendationCard.tsx`
- Props: `{ title, year, type, reason, tmdbId?, posterUrl? }`
- Отображает: постер (или placeholder), название + год, бейдж типа (фильм/сериал/аниме), причину рекомендации
- Кнопка "Добавить в список" — вызывает Server Action для `createMediaItem()`
- По клику на постер/название → `href="/media/[tmdbId]"` (если tmdbId есть)
- `data-testid="recommendation-card"` на корневом элементе
- `data-testid="recommendation-add-button"` на кнопке добавления

---

### Step 6: TasteProfileCard Component
- [x] Создать `components/recommendations/TasteProfileCard.tsx`
- Props: `{ lastUpdated: Date | null, itemCount: number, onUpdate: () => void, isUpdating: boolean }`
- Если нет профиля → предупреждение "Профиль вкусов не создан"
- Если профиль есть → "Обновлён [дата]"
- Предупреждение об актуализации: "Если ты недавно обновлял библиотеку — обнови профиль перед запросом рекомендаций"
- Кнопка "Обновить профиль вкусов" с лоадером
- `data-testid="taste-profile-card"`
- `data-testid="update-profile-button"`

---

### Step 7: RecommendationQuestionnaire Component
- [x] Создать `components/recommendations/RecommendationQuestionnaire.tsx`
- Props: `{ onSubmit: (answers: QuestionnaireAnswers) => void, isLoading: boolean, disabled: boolean }`
- 4 вопроса:
  - Q1 (contentType): radio — Фильм / Мультфильм / Сериал / Аниме / Неважно
  - Q2 (mood): radio — 6 вариантов с юмористическими подписями
  - Q3 (exclusions): checkboxes — 4 тега исключений + "Всё устраивает"
  - Q4 (familiarity): radio — Только новое / Включая отложенные / Включая пересмотр
- Кнопка "Получить рекомендации" — disabled пока не выбраны Q1 и Q2
- `data-testid="recommendation-questionnaire"`
- `data-testid="submit-questionnaire-button"`

---

### Step 8: RecommendationResults Component
- [x] Создать `components/recommendations/RecommendationResults.tsx`
- Props: `{ introText: string, isStreamingIntro: boolean, isLoadingCards: boolean, cards: RecommendationCardData[], onReset: () => void }`
- Три состояния:
  1. Streaming intro → показываем текст по мере поступления + `"Формирую список..."` пульсирующий индикатор
  2. Loading cards (intro готов, ждём JSON + TMDB) → intro отображён + пульсирующий индикатор
  3. Cards ready → intro + сетка карточек `RecommendationCard`
- Кнопка "Новая анкета" → вызывает `onReset`
- `data-testid="recommendation-results"`
- `data-testid="new-questionnaire-button"`

---

### Step 9: RecommendationsPage Client Component
- [x] Создать `components/recommendations/RecommendationsPage.tsx`
- Client Component — управляет всем состоянием страницы
- Props: `{ initialProfile: TasteProfile | null, itemCount: number }`
- State: `profile`, `isUpdatingProfile`, `phase` (`questionnaire` | `loading` | `results`), `introText`, `isStreamingIntro`, `isLoadingCards`, `cards`
- `handleUpdateProfile()` → POST `/api/recommendations/profile` → обновляет `profile` state
- `handleSubmitQuestionnaire(answers)`:
  1. Переключает phase → `loading`
  2. POST `/api/recommendations/generate` → streaming response
  3. Читает поток через `ReadableStreamDefaultReader`
  4. Накапливает текст, детектирует ` ```json ` → переключает intro/loading-cards
  5. После закрывающего ` ``` ` — парсит JSON, делает параллельные TMDB search запросы
  6. Обновляет `cards`, переключает phase → `results`
- `handleReset()` → phase → `questionnaire`, очищает cards/intro
- Если `itemCount < 5` → показывает блокирующее сообщение вместо анкеты
- Если нет профиля → блокирует кнопку анкеты с объяснением

---

### Step 10: Recommendations Page (Server Component)
- [x] Создать `app/(app)/recommendations/page.tsx`
- Server Component
- `export const dynamic = 'force-dynamic'`
- Загружает auth user через `createServerClient()`
- Загружает `taste_profiles` запись для user
- Считает количество `media_items` пользователя
- Передаёт в `<RecommendationsPage initialProfile={...} itemCount={...} />`

---

### Step 11: Server Action — Add to Library
- [x] Создать `app/actions/recommendations.ts`
- `addRecommendedTitle(tmdbId: number, type: MediaType)` — Server Action
- Вызывает `createMediaItem()` из `lib/supabase/media.ts` со статусом `planned`
- Возвращает `{ success: boolean, error?: string }`
- Используется в `RecommendationCard` через `useTransition`

---

### Step 12: Navbar Update
- [x] Модифицировать `components/Navbar.tsx`
- Добавить импорт `Sparkles` из `lucide-react`
- Добавить в `NAV_LINKS`:
  ```ts
  { href: '/recommendations', label: 'Для тебя', icon: Sparkles }
  ```

---

### Step 13: Types
- [x] Добавить типы в `types/index.ts` (или создать `types/recommendations.ts`):
  ```ts
  interface QuestionnaireAnswers {
    contentType: 'movie' | 'animation' | 'tv' | 'anime' | 'any'
    mood: string
    exclusions: string[]
    familiarity: 'new_only' | 'include_planned' | 'include_rewatch'
  }
  interface RecommendationCardData {
    title: string
    year: number | null
    type: string
    reason: string
    tmdbId?: number
    posterUrl?: string | null
  }
  interface TasteProfile {
    summary: string
    updated_at: string
  }
  ```

---

## Execution Order

```
Step 1  → DB Migration
Step 2  → Groq Service (lib layer)
Step 3  → Profile API Route
Step 4  → Generate API Route (streaming)
Step 5  → RecommendationCard
Step 6  → TasteProfileCard
Step 7  → RecommendationQuestionnaire
Step 8  → RecommendationResults
Step 9  → RecommendationsPage (Client)
Step 10 → /recommendations page (Server)
Step 11 → Server Action
Step 12 → Navbar update
Step 13 → Types
```

---

## Notes

- Groq fetch без SDK: `fetch('https://api.groq.com/openai/v1/chat/completions', { body: JSON.stringify({ model, messages, stream: true }) })`
- Streaming detection: ищем ` ```json\n ` в накопленном тексте как разделитель intro/JSON
- TMDB enrichment: используем существующий `search(query)` из `lib/tmdb/tmdb.service.ts`
- `createMediaItem` уже обрабатывает дубли (возвращает `{ error: 'already_exists' }`)
- `data-testid` на всех интерактивных элементах согласно code-generation rules
