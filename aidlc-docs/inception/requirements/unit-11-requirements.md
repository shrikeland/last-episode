# Unit 11 — AI Recommendations: Requirements Document

**Request Type**: New Feature
**Scope**: Multiple Components (new route, API routes, Supabase table, LLM integration)
**Complexity**: Complex

---

## 1. Intent Summary

Новый раздел `/recommendations` — персонализированные рекомендации на просмотр, сформированные LLM на основе:
1. Профиля вкусов пользователя (pre-summary его библиотеки, кешированный в Supabase)
2. Ответов на короткую анкету из 4 вопросов

---

## 2. Анкета пользователя (4 вопроса)

### Q1: Что хочешь посмотреть сегодня?
Тип контента — single-select:
- Фильм
- Мультфильм
- Сериал
- Аниме
- Неважно — всё подряд

### Q2: Какой ты сегодня?
Настроение — single-select:
- На расслабоне — хочу что-то лёгкое, уютное и без напряга
- Режим суетолога — нужен движ, экшн и чтобы не отпускало
- Философ на смене — дайте что-то умное, многослойное и со смыслом
- Стеклянный человек — мне нужно попереживать и поплакать
- Генератор хихи — хочу смеяться 5 минут
- Проверю, закрыта ли дверь — дайте что-то жуткое и напряжённое

### Q3: Что точно не хочу сегодня?
Исключения — multi-select (можно выбрать несколько или ни одного):
- Без грустных концовок
- Без насилия и жести
- Без растянутых историй
- Без романтических линий
- (опция "Всё устраивает" — снимает все ограничения)

### Q4: Из чего выбираем?
Знакомость — single-select:
- Только новое (не из моей библиотеки)
- Можно включить отложенные и брошенные
- Можно предложить пересмотреть любимое

---

## 3. LLM Integration

### Провайдер
- **Groq** (free tier) — модели `llama-3.3-70b-versatile` для рекомендаций
- API key хранится в `.env` как `GROQ_API_KEY` (один ключ на приложение)
- Нужна инструкция по регистрации в Groq и получению API ключа

### Профиль вкусов (Pre-Summary)

**Генерация:**
- Пользователь нажимает кнопку "Обновить профиль вкусов" на странице рекомендаций
- Server Action / API route забирает ВСЕ `media_items` пользователя из Supabase
- Отправляет их в Groq (`llama-3.3-70b-versatile`) с промптом анализа
- LLM возвращает текстовый профиль вкусов (~200-400 слов)
- Результат сохраняется в таблице `taste_profiles` (user_id, summary, updated_at)

**Кеширование:**
- Обновляется только по явному запросу пользователя (кнопка)
- На странице отображается дата последнего обновления
- Предупреждение: "Если ты недавно обновлял библиотеку — нажми «Обновить профиль» перед формированием рекомендаций"

**Минимальный порог:**
- Если у пользователя < 5 тайтлов в библиотеке — показывать блокирующее сообщение:
  "Добавь хотя бы 5 тайтлов в библиотеку, чтобы получать персонализированные рекомендации"
- Кнопка анкеты недоступна до обновления профиля

### Рекомендационный запрос

**Промпт структура:**
```
System: Ты — кинокуратор с тонким вкусом. На основе профиля вкусов пользователя и его анкеты подбери 5-7 персонализированных рекомендаций. Сначала напиши 2-3 предложения персонального вступления (обращайся к пользователю на "ты"). Затем — строго JSON-массив.

User:
Профиль вкусов: [taste_profile.summary]

Сегодняшняя анкета:
- Тип контента: [Q1]
- Настроение: [Q2]
- Исключения: [Q3]
- Из чего выбирать: [Q4]

Верни ответ в формате:
[2-3 предложения вступления]
```json
[{"title": "...", "year": 2023, "type": "movie|tv|anime", "reason": "..."}]
```
```

### Streaming Flow
1. POST `/api/recommendations/generate` → Groq streaming request
2. Фронтенд накапливает токены:
   - До появления ` ```json ` — это текстовое вступление, выводим в реальном времени (streaming)
   - После ` ```json ` — показываем пульсирующий индикатор "Формирую список..."
   - После закрывающего ` ``` ` — парсим JSON, запрашиваем TMDB, отображаем карточки
3. Если JSON не распарсился — graceful fallback: показываем только текстовое вступление + сообщение об ошибке

---

## 4. TMDB Обогащение

После получения JSON-списка от LLM:
- Для каждого тайтла: `searchMulti(title + year)` через существующий `lib/tmdb/tmdb.service.ts`
- Берём первый релевантный результат
- Если найден — карточка с постером
- Если не найден — карточка-заглушка с названием и причиной рекомендации

---

## 5. Карточка рекомендации

Каждая рекомендация отображается как карточка:
- Постер (TMDB) или placeholder
- Название + год + тип
- "Почему рекомендую" (поле `reason` из JSON)
- Кнопка **"Добавить в список"** — добавляет тайтл в библиотеку (статус `planned`), использует существующую логику `createMediaItem`
- По клику на постер/название → переход на `/media/[tmdb_id]`

---

## 6. Страница `/recommendations` — UX Flow

```
[Страница рекомендаций]
│
├── [Блок: Профиль вкусов]
│   ├── Статус: "Обновлён 24 марта 2026" / "Профиль не создан"
│   ├── Предупреждение (если нет профиля или давно не обновлялся)
│   └── Кнопка "Обновить профиль вкусов" [загрузка 5-15 сек]
│
├── [Блок: Анкета] — заблокирован если нет профиля
│   ├── Q1: Тип контента (radio)
│   ├── Q2: Настроение (radio с emoji)
│   ├── Q3: Исключения (checkboxes)
│   ├── Q4: Знакомость (radio)
│   └── Кнопка "Получить рекомендации"
│
└── [Блок: Результаты] — появляется после генерации
    ├── Текст вступления (streaming)
    ├── Индикатор "Формирую список..." (пока ждём JSON)
    ├── Сетка карточек рекомендаций (5-7 карточек)
    └── Кнопка "Новая анкета" (сбрасывает результаты, возвращает к анкете)
```

---

## 7. База данных

### Новая таблица: `taste_profiles`
```sql
CREATE TABLE taste_profiles (
  id          UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT taste_profiles_unique_user UNIQUE (user_id)
);

ALTER TABLE taste_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taste_profiles_select" ON taste_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "taste_profiles_insert" ON taste_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "taste_profiles_update" ON taste_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "taste_profiles_delete" ON taste_profiles FOR DELETE USING (auth.uid() = user_id);
```

---

## 8. Файловая структура (новые файлы)

```
app/(app)/recommendations/
  page.tsx                          # Server Component (проверяет auth, считает кол-во тайтлов)

app/api/recommendations/
  profile/route.ts                  # POST: генерация/обновление taste_profile
  generate/route.ts                 # POST: streaming генерация рекомендаций

components/recommendations/
  RecommendationsPage.tsx           # Client Component — основной лэйаут страницы
  TasteProfileCard.tsx              # Статус профиля + кнопка обновления
  RecommendationQuestionnaire.tsx   # Анкета (4 вопроса)
  RecommendationResults.tsx         # Результаты (streaming intro + карточки)
  RecommendationCard.tsx            # Карточка тайтла (постер, reason, добавить в список)

lib/groq/
  groq.service.ts                   # Groq клиент (fetch-based streaming)

supabase/migrations/
  20260324000000_taste_profiles.sql  # Новая таблица
```

---

## 9. Навигация

В `components/Navbar.tsx` добавить пункт:
```
{ href: '/recommendations', label: 'Для тебя', icon: Sparkles }
```
(иконка `Sparkles` из lucide-react)

---

## 10. Non-Functional Requirements

- Pre-summary generation: ожидаемое время 5-15 сек (предупредить пользователя)
- Recommendation generation: ожидаемое время 3-10 сек (streaming делает ожидание комфортнее)
- Groq free tier limits: 6,000 requests/day, 500,000 tokens/day — достаточно для личного использования
- Рекомендации не сохраняются (генерируются заново каждый раз)
- GROQ_API_KEY добавить в Vercel env vars при деплое

---

## 11. Groq Registration (инструкция — включить в Build и Test)

1. Зайти на https://console.groq.com
2. Sign Up через email (карта не нужна для free tier)
3. Settings → API Keys → Create API Key
4. Скопировать ключ → добавить в `.env.local` как `GROQ_API_KEY=gsk_...`
5. Добавить в Vercel Dashboard → Settings → Environment Variables → `GROQ_API_KEY`
