import { createServerClient } from '@/lib/supabase/server'
import { getMediaItems } from '@/lib/supabase/media'
import { generate, generateStream, parseSseDelta, parseSseUsage } from '@/lib/groq/groq.service'
import { search, buildPosterUrl } from '@/lib/tmdb/tmdb.service'
import type { TmdbSearchResult } from '@/types'
import type { RecommendationCardData, QuestionnaireAnswers, ContentType } from '@/types/recommendations'

// Markers used to communicate phases to the client
const INTRO_DONE_MARKER = '\n__INTRO_DONE__\n'
const CARDS_MARKER = '\n__CARDS__:'

const SYSTEM_PROMPT = `Ты — кинокуратор. Предлагаешь пул кандидатов для рекомендации.

Формат строго:
1. Вступление — ровно 2 предложения, обращение на «ты»
2. JSON-массив — сразу после вступления
3. После JSON ничего не добавлять

Каждый объект: {"title":string,"year":number,"type":"movie"|"animation"|"tv"|"anime","reason":string}

Правила:
- title: оригинальное название без года, без кириллицы в иноязычных тайтлах
- Только художественный контент. Нельзя: концерты, making-of, fan events, спешлы, стэнд-апы, live-шоу, компиляции
- Только тайтлы с рейтингом ≥ 6.5 и ≥ 1000 голосов
- Если не уверен в соответствии типу или настроению — не включай
- Во вступлении не упоминай количество подобранных вариантов`

// Mood → excluded TMDB genre IDs (enforced server-side after enrichment)
// Genre IDs: 28=Action, 35=Comedy, 27=Horror, 10749=Romance, 10402=Music,
//   10752=War, 53=Thriller, 10751=Family, 10759=Action&Adventure(tv), 10768=War&Politics(tv)
const MOOD_EXCLUDED_GENRE_IDS: Record<string, number[]> = {
  'На расслабоне':             [27, 10752, 53],          // Horror, War, Thriller
  'Режим суетолога':           [10749, 10402],            // Romance, Music
  'Философ на смене':          [],
  'Стеклянный человек':        [28, 10759, 27],           // Action, Action&Adventure, Horror
  'Генератор хихи':            [27, 53, 10752, 10768],    // Horror, Thriller, War, War&Politics
  'Проверю, закрыта ли дверь': [10751, 35, 10402],       // Family, Comedy, Music
}

// Mood → LLM-facing text hint (guides candidate generation)
const MOOD_LLM_HINTS: Record<string, string> = {
  'На расслабоне':             'Лёгкое, уютное, без напряга. Исключить ужасы, тяжёлые триллеры, войну.',
  'Режим суетолога':           'Движ, экшн, темп, напряжение. Исключить мелодрамы и музыкальные фильмы.',
  'Философ на смене':          'Умное, многослойное, глубокое. Приветствуются детективы, фантастика, арт-хаус.',
  'Стеклянный человек':        'Эмоциональная драма, переживания. Исключить экшн и ужасы.',
  'Генератор хихи':            'Комедия, смех, развлечение. Исключить ужасы, триллеры, войну.',
  'Проверю, закрыта ли дверь': 'Жуть, напряжение, хоррор или психологический триллер. Исключить комедии и семейное.',
}

// User-selected exclusion tags → excluded TMDB genre IDs
const EXCLUSION_GENRE_IDS: Record<string, number[]> = {
  'Без насилия и жести':       [27, 53, 10752, 10768],   // Horror, Thriller, War, War&Politics
  'Без романтических линий':   [10749],                   // Romance
}

function buildUserPrompt(
  summary: string,
  answers: QuestionnaireAnswers,
  libraryContext: string,
  recentTitles: string[]
): string {
  const exclusionsText =
    answers.exclusions.length > 0 ? answers.exclusions.join(', ') : 'нет'

  const contentTypeText: Record<string, string> = {
    movie: 'только игровые фильмы (type: "movie"). Запрещены сериалы, аниме, мультфильмы.',
    animation: 'только западная анимационная полнометражка (type: "animation"). Запрещены аниме, мультсериалы, игровые фильмы.',
    tv: 'только сериалы (type: "tv"). Запрещены фильмы и аниме.',
    anime: 'только аниме (type: "anime"). Запрещены обычные фильмы и сериалы.',
    any: 'любой тип.',
  }

  const familiarityLabels: Record<string, string> = {
    new_only: 'только тайтлы не из библиотеки',
    include_planned: 'можно из запланированных/отложенных',
    include_rewatch: 'можно предложить пересмотреть любимое',
  }

  const moodKey = getMoodKey(answers.mood)
  const moodHint = MOOD_LLM_HINTS[moodKey] ?? answers.mood

  const antiRepeatSection = recentTitles.length > 0
    ? `\nНедавно уже рекомендовались — не предлагай их повторно:\n${recentTitles.map((t) => `- ${t}`).join('\n')}\n`
    : ''

  return `Профиль вкусов:
${summary}

${libraryContext}
${antiRepeatSection}
Анкета:
- Тип контента: ${contentTypeText[answers.contentType] ?? answers.contentType}
- Настроение: ${moodHint}
- Исключения: ${exclusionsText}
- Из чего выбирать: ${familiarityLabels[answers.familiarity] ?? answers.familiarity}

Сначала вступление (2 предложения). Потом строго JSON-массив из 15 кандидатов (это пул для серверного отбора, не финальный список). Разнообразь: разные эпохи, страны, режиссёры. Не включай тайтл, если не уверен в соответствии типу.
\`\`\`json
[{"title": "Название", "year": 2023, "type": "movie|animation|tv|anime", "reason": "Почему подходит"}]
\`\`\``
}

// Strip trailing year that LLM sometimes adds to the title field (e.g. "Marriage Story 2019")
function stripTrailingYear(title: string): string {
  return title.replace(/\s*\(?\d{4}\)?\s*$/, '').trim()
}

const MIN_VOTE_COUNT = 1000
const MIN_VOTE_AVERAGE = 6.5

// --- Server-side filtering helpers ---

function getMoodKey(mood: string): string {
  for (const key of Object.keys(MOOD_EXCLUDED_GENRE_IDS)) {
    if (mood.startsWith(key)) return key
  }
  return ''
}

function matchesRequestedType(contentType: ContentType, tmdbType: string): boolean {
  if (contentType === 'any') return true
  return tmdbType === contentType
}

function matchesMood(genreIds: number[], mood: string): boolean {
  const key = getMoodKey(mood)
  const excluded = MOOD_EXCLUDED_GENRE_IDS[key] ?? []
  if (excluded.length === 0) return true
  return !genreIds.some((id) => excluded.includes(id))
}

function matchesExclusions(genreIds: number[], exclusions: string[]): boolean {
  for (const excl of exclusions) {
    const excluded = EXCLUSION_GENRE_IDS[excl]
    if (!excluded) continue
    if (genreIds.some((id) => excluded.includes(id))) return false
  }
  return true
}

// Score-based best match selection (beats simple "first result" or "by year only")
function pickBestSearchResult(
  results: TmdbSearchResult[],
  requestedTitle: string,
  requestedYear: number | null
): TmdbSearchResult | null {
  if (results.length === 0) return null
  const clean = requestedTitle.toLowerCase()

  const scored = results.map((r) => {
    let score = 0
    const title = r.title.toLowerCase()
    if (title === clean) score += 100
    else if (title.includes(clean) || clean.includes(title)) score += 50
    if (requestedYear && r.release_year === requestedYear) score += 40
    else if (requestedYear && r.release_year && Math.abs(r.release_year - requestedYear) <= 1) score += 20
    score += Math.min((r.vote_count ?? 0) / 1000, 10)
    score += Math.min((r.vote_average ?? 0) * 2, 20)
    return { r, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.r ?? null
}

// Pick top 5 with decade spread to avoid temporal clustering
function selectDiverseTop5(
  candidates: RecommendationCardData[],
  contentType: ContentType
): RecommendationCardData[] {
  if (candidates.length <= 5) return candidates

  const selected: RecommendationCardData[] = []
  const decadeCounts: Record<number, number> = {}
  // When specific type is requested all items share that type — decade diversity is the main lever
  const maxPerDecade = contentType === 'any' ? 2 : 3

  for (const c of candidates) {
    if (selected.length >= 5) break
    const decade = c.year ? Math.floor(c.year / 10) : -1
    const count = decadeCounts[decade] ?? 0
    if (decade === -1 || count < maxPerDecade) {
      selected.push(c)
      decadeCounts[decade] = count + 1
    }
  }

  // Fill remaining slots if strict diversity left gaps
  if (selected.length < 5) {
    for (const c of candidates) {
      if (selected.length >= 5) break
      if (!selected.includes(c)) selected.push(c)
    }
  }

  return selected
}

function buildRetryUserPrompt(originalPrompt: string, triedTitles: string[]): string {
  return `${originalPrompt}\n\nПервая попытка не дала достаточно подходящих результатов. Предложи 15 ДРУГИХ кандидатов. Не повторяй эти тайтлы:\n${triedTitles.map((t) => `- ${t}`).join('\n')}`
}

 
async function loadRecentRecommendations(supabase: any, userId: string, days = 45) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('recommendation_history')
    .select('tmdb_id, title')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!data || data.length === 0) return { ids: new Set<number>(), titles: [] as string[] }
  return {
    ids: new Set<number>(data.map((r: { tmdb_id: number }) => r.tmdb_id)),
    titles: data.map((r: { title: string }) => r.title) as string[],
  }
}

 
async function saveRecommendationHistory(supabase: any, userId: string, cards: RecommendationCardData[]) {
  const rows = cards
    .filter((c) => c.tmdbId !== null)
    .map((c) => ({ user_id: userId, tmdb_id: c.tmdbId!, title: c.title }))
  if (rows.length === 0) return
  await supabase.from('recommendation_history').insert(rows)
}

async function enrichWithTmdb(
  items: { title: string; year: number | null; type: string; reason: string }[],
  contentType: ContentType,
  mood: string,
  exclusions: string[],
  recentTmdbIds: Set<number>
): Promise<RecommendationCardData[]> {
  const seen = new Set<number>()

  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const cleanTitle = stripTrailingYear(item.title)

        let searchResults = item.year ? await search(`${cleanTitle} ${item.year}`) : []
        if (searchResults.length === 0) searchResults = await search(cleanTitle)

        // Quality filter: only consider results meeting the quality bar
        const qualityResults = searchResults.filter(
          (r) =>
            (r.vote_count ?? 0) >= MIN_VOTE_COUNT &&
            (r.vote_average ?? 0) >= MIN_VOTE_AVERAGE
        )
        if (qualityResults.length === 0) return null

        const match = pickBestSearchResult(qualityResults, cleanTitle, item.year)
        if (!match) return null

        // Deduplicate by TMDB ID within this batch
        if (seen.has(match.tmdb_id)) return null
        seen.add(match.tmdb_id)

        // Anti-repeat: skip recently recommended titles
        if (recentTmdbIds.has(match.tmdb_id)) return null

        // Strict content type filter (TMDB normalizeType is ground truth)
        if (!matchesRequestedType(contentType, match.type)) return null

        // Mood genre filter
        if (!matchesMood(match.genre_ids ?? [], mood)) return null

        // User exclusion filter
        if (!matchesExclusions(match.genre_ids ?? [], exclusions)) return null

        return {
          title: match.title ?? cleanTitle,
          year: item.year ?? match.release_year ?? null,
          type: match.type,
          reason: item.reason,
          tmdbId: match.tmdb_id ?? null,
          posterUrl: match.poster_path ? buildPosterUrl(match.poster_path) : null,
        }
      } catch {
        return null
      }
    })
  )

  return results.filter((r): r is NonNullable<typeof r> => r !== null) as RecommendationCardData[]
}

function buildLibraryContext(
  items: { title: string; status: string; rating: number | null }[],
  familiarity: string
): string {
  if (familiarity === 'new_only') {
    if (items.length === 0) return ''
    const titleList = items.map((i) => `- ${i.title}`).join('\n')
    return `СТРОГО ЗАПРЕЩЕНО рекомендовать следующие тайтлы — они уже есть в библиотеке пользователя:\n${titleList}\n\nРекомендуй ИСКЛЮЧИТЕЛЬНО тайтлы, которых НЕТ в этом списке.`
  }
  if (familiarity === 'include_planned') {
    const planned = items
      .filter((i) => i.status === 'planned' || i.status === 'on_hold')
      .map((i) => `- ${i.title}`)
      .join('\n')
    const watched = items
      .filter((i) => i.status !== 'planned' && i.status !== 'on_hold')
      .map((i) => `- ${i.title}`)
      .join('\n')
    return [
      planned ? `Можно рекомендовать из запланированных/отложенных:\n${planned}` : '',
      watched ? `НЕ рекомендовать (уже просматривал):\n${watched}` : '',
    ].filter(Boolean).join('\n\n')
  }
  if (familiarity === 'include_rewatch') {
    const loved = items
      .filter((i) => i.rating != null && i.rating >= 8)
      .map((i) => `- ${i.title} (${i.rating}/10)`)
      .join('\n')
    const rest = items
      .filter((i) => i.rating == null || i.rating < 8)
      .map((i) => `- ${i.title}`)
      .join('\n')
    return [
      loved ? `Можно предложить пересмотреть (высоко оценённые):\n${loved}` : '',
      rest ? `НЕ рекомендовать новые из этого списка:\n${rest}` : '',
    ].filter(Boolean).join('\n\n')
  }
  return ''
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const body = await request.json() as { questionnaire: QuestionnaireAnswers }
    const { questionnaire } = body

    // Load taste profile
    const { data: profileRow, error: profileErr } = await supabase
      .from('taste_profiles')
      .select('summary')
      .eq('user_id', user.id)
      .single()

    if (profileErr || !profileRow) {
      return new Response(JSON.stringify({ error: 'no_profile' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Load library for context
    const items = await getMediaItems(supabase, user.id)
    const libraryContext = buildLibraryContext(
      items.map((i) => ({ title: i.title, status: i.status, rating: i.rating })),
      questionnaire.familiarity
    )
    // Hard server-side exclusion set: for new_only, filter enriched cards by tmdb_id
    const libraryTmdbIds = questionnaire.familiarity === 'new_only'
      ? new Set(items.map((i) => i.tmdb_id).filter(Boolean))
      : null

    // Load recommendation history for anti-repeat filtering
    const { ids: recentTmdbIds, titles: recentTitles } =
      await loadRecentRecommendations(supabase, user.id)

    const userPrompt = buildUserPrompt(profileRow.summary, questionnaire, libraryContext, recentTitles)

    const groqResponse = await generateStream(SYSTEM_PROMPT, userPrompt)
    const groqReader = groqResponse.body!.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const JSON_MARKER = '```json'
        // Keep last 6 chars buffered: covers ```json (7 chars) and \n[ (2 chars) before they're sent
        const MARKER_SAFE_BUFFER = JSON_MARKER.length - 1

        let sseBuffer = ''
        let introAccumulated = ''
        let introAlreadySent = 0  // chars already flushed to client
        let jsonBuffer = ''
        let introSent = false
        let usageLogged = false

        // Detect JSON start: either ```json marker or a raw JSON array on its own line (\n[)
        function detectJsonStart(text: string): { detectedAt: number; jsonContentStart: number } | null {
          const codeIdx = text.indexOf(JSON_MARKER)
          const rawIdx = text.search(/\n\s*\[/)
          if (codeIdx !== -1 && (rawIdx === -1 || codeIdx <= rawIdx)) {
            return { detectedAt: codeIdx, jsonContentStart: codeIdx + JSON_MARKER.length }
          }
          if (rawIdx !== -1) {
            // Skip the leading \n, start json at [
            const bracketOffset = text.slice(rawIdx).search(/\[/)
            return { detectedAt: rawIdx, jsonContentStart: rawIdx + bracketOffset }
          }
          return null
        }

        try {
          while (true) {
            const { done, value } = await groqReader.read()
            if (done) break

            sseBuffer += decoder.decode(value, { stream: true })
            const lines = sseBuffer.split('\n')
            sseBuffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!usageLogged) {
                const usage = parseSseUsage(line)
                if (usage) {
                  console.log(`[groq/stream] prompt=${usage.prompt} completion=${usage.completion} total=${usage.total}`)
                  usageLogged = true
                }
              }
              const content = parseSseDelta(line)
              if (!content) continue

              if (!introSent) {
                introAccumulated += content
                const found = detectJsonStart(introAccumulated)
                if (found) {
                  // Send only the unsent portion of intro before the marker
                  const unsent = introAccumulated.slice(introAlreadySent, found.detectedAt).trimEnd()
                  if (unsent) controller.enqueue(encoder.encode(unsent))
                  controller.enqueue(encoder.encode(INTRO_DONE_MARKER))
                  introSent = true
                  jsonBuffer = introAccumulated.slice(found.jsonContentStart)
                } else {
                  // Safe-buffer: keep last MARKER_SAFE_BUFFER chars to avoid partial-marker leaking
                  const safeEnd = Math.max(introAlreadySent, introAccumulated.length - MARKER_SAFE_BUFFER)
                  if (safeEnd > introAlreadySent) {
                    controller.enqueue(encoder.encode(introAccumulated.slice(introAlreadySent, safeEnd)))
                    introAlreadySent = safeEnd
                  }
                }
              } else {
                jsonBuffer += content
              }
            }
          }

          // If LLM finished but intro marker was never found, extract JSON from full buffer
          if (!introSent) {
            const found = detectJsonStart(introAccumulated)
            if (found) {
              const unsent = introAccumulated.slice(introAlreadySent, found.detectedAt).trimEnd()
              if (unsent) controller.enqueue(encoder.encode(unsent))
              controller.enqueue(encoder.encode(INTRO_DONE_MARKER))
              jsonBuffer = introAccumulated.slice(found.jsonContentStart)
            } else {
              // No JSON at all — flush remaining intro and signal done with empty cards
              const remaining = introAccumulated.slice(introAlreadySent).trim()
              if (remaining) controller.enqueue(encoder.encode(remaining))
              controller.enqueue(encoder.encode(INTRO_DONE_MARKER))
              controller.enqueue(encoder.encode(CARDS_MARKER + '[]' + '\n'))
              return
            }
          }

          // Groq stream finished — parse JSON and enrich
          // Use bracket-counting instead of greedy regex to avoid capturing trailing
          // text that the LLM might add after the closing ] (e.g. "В списке [5 фильмов]")
          type RawItem = { title: string; year: number | null; type: string; reason: string }

          const jsonArrayStr = extractJsonArray(jsonBuffer)
          if (jsonArrayStr) {
            const rawItems = JSON.parse(jsonArrayStr) as RawItem[]

            let cards = await enrichWithTmdb(
              rawItems,
              questionnaire.contentType,
              questionnaire.mood,
              questionnaire.exclusions,
              recentTmdbIds
            )
            // Hard exclusion of library items LLM might have ignored
            if (libraryTmdbIds && libraryTmdbIds.size > 0) {
              cards = cards.filter((c) => !c.tmdbId || !libraryTmdbIds.has(c.tmdbId))
            }

            // Retry pass: if filters left too few cards, ask LLM for another batch
            if (cards.length < 3) {
              try {
                const retryText = await generate(
                  SYSTEM_PROMPT,
                  buildRetryUserPrompt(userPrompt, rawItems.map((i) => i.title))
                )
                const retryJsonStr = extractJsonArray(retryText)
                if (retryJsonStr) {
                  const retryItems = JSON.parse(retryJsonStr) as RawItem[]
                  const moreCards = await enrichWithTmdb(
                    retryItems,
                    questionnaire.contentType,
                    questionnaire.mood,
                    questionnaire.exclusions,
                    recentTmdbIds
                  )
                  const filteredMore = libraryTmdbIds?.size
                    ? moreCards.filter((c) => !c.tmdbId || !libraryTmdbIds.has(c.tmdbId))
                    : moreCards
                  const seenIds = new Set(cards.map((c) => c.tmdbId).filter(Boolean))
                  for (const c of filteredMore) {
                    if (!c.tmdbId || !seenIds.has(c.tmdbId)) cards.push(c)
                  }
                }
              } catch (retryErr) {
                console.error('[recommendations/generate retry]', retryErr)
              }
            }

            // Pick top 5 with decade-based diversity
            cards = selectDiverseTop5(cards, questionnaire.contentType)
            controller.enqueue(encoder.encode(CARDS_MARKER + JSON.stringify(cards) + '\n'))
            // Save to history (fire-and-forget — doesn't block the response)
            void saveRecommendationHistory(supabase, user.id, cards)
          } else {
            controller.enqueue(encoder.encode(CARDS_MARKER + '[]' + '\n'))
          }

          // Finds the first JSON array in text by counting brackets (ignores greedy trailing content)
          function extractJsonArray(text: string): string | null {
            const start = text.indexOf('[')
            if (start === -1) return null
            let depth = 0
            let inString = false
            let escape = false
            for (let i = start; i < text.length; i++) {
              const c = text[i]
              if (escape) { escape = false; continue }
              if (c === '\\' && inString) { escape = true; continue }
              if (c === '"') { inString = !inString; continue }
              if (inString) continue
              if (c === '[' || c === '{') depth++
              else if (c === ']' || c === '}') {
                depth--
                if (depth === 0) return text.slice(start, i + 1)
              }
            }
            return null
          }
        } catch (err) {
          console.error('[recommendations/generate stream]', err)
          controller.enqueue(encoder.encode(CARDS_MARKER + '[]' + '\n'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[recommendations/generate]', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}