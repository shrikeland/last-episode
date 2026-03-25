import { createServerClient } from '@/lib/supabase/server'
import { getMediaItems } from '@/lib/supabase/media'
import { generateStream, parseSseDelta } from '@/lib/groq/groq.service'
import { search, buildPosterUrl } from '@/lib/tmdb/tmdb.service'
import type { RecommendationCardData, QuestionnaireAnswers } from '@/types/recommendations'

// Markers used to communicate phases to the client
const INTRO_DONE_MARKER = '\n__INTRO_DONE__\n'
const CARDS_MARKER = '\n__CARDS__:'

const SYSTEM_PROMPT = `Ты — кинокуратор с безупречным вкусом. Подбирай рекомендации точно и персонально.
Сначала напиши короткое вступление (2–3 предложения, обращайся на "ты"), затем — строго JSON-массив.
Не пиши ничего после JSON-массива. Используй только типы: movie, animation, tv, anime. Тип animation — для анимационных полнометражных фильмов (например, Disney/Pixar/DreamWorks), не аниме.
В поле "title" ВСЕГДА используй оригинальное название на языке оригинала (английский, японский романизированный и т.д.). НИКОГДА не транслитерируй и не смешивай кириллицу с латиницей. Примеры правильно: "Ghost in the Shell", "Neon Genesis Evangelion", "Inception". Примеры неправильно: "Гhosts in the Shell", "Тексhnолиз".
Строго соблюдай запрет на рекомендации тайтлов из библиотеки пользователя.
Рекомендуй ТОЛЬКО признанные, качественные тайтлы с высоким рейтингом (IMDb ≥ 6.0 или эквивалент). Никакого мусора, B-movie без культового статуса, прямых видеорелизов или малоизвестных проходных работ. Если подходящих качественных тайтлов мало — лучше предложи меньше, чем рекомендовать посредственность.`

function buildUserPrompt(
  summary: string,
  answers: QuestionnaireAnswers,
  libraryContext: string
): string {
  const exclusionsText =
    answers.exclusions.length > 0 ? answers.exclusions.join(', ') : 'нет ограничений'

  // Strict content type constraints sent directly to LLM
  const contentTypeConstraints: Record<string, string> = {
    movie: 'СТРОГО только фильмы (type: "movie"). Аниме, сериалы и мультфильмы — ЗАПРЕЩЕНЫ.',
    animation: 'СТРОГО только западные анимационные полнометражные фильмы (Disney, Pixar, DreamWorks, Blue Sky, Ghibli и подобные). Тип СТРОГО "animation". ЗАПРЕЩЕНЫ: японское аниме (для него type: "anime"), игровые фильмы, мультсериалы. Только признанные полнометражные мультфильмы НЕ японского производства.',
    tv: 'СТРОГО только сериалы (type: "tv"). Фильмы и аниме — ЗАПРЕЩЕНЫ.',
    anime: 'СТРОГО только аниме (type: "anime"). Фильмы и обычные сериалы — ЗАПРЕЩЕНЫ.',
    any: 'Любой тип контента приветствуется.',
  }

  const familiarityLabels: Record<string, string> = {
    new_only: 'только новые тайтлы (не из моей библиотеки)',
    include_planned: 'можно из запланированных и отложенных',
    include_rewatch: 'можно предложить пересмотреть любимое',
  }

  return `Профиль вкусов:
${summary}

${libraryContext}

Сегодняшняя анкета:
- Тип контента: ${contentTypeConstraints[answers.contentType] ?? answers.contentType}
- Настроение: ${answers.mood}
- Исключения: ${exclusionsText}
- Из чего выбирать: ${familiarityLabels[answers.familiarity] ?? answers.familiarity}

Подбери топ-5 рекомендаций. Сначала вступление (2–3 предложения), потом строго в формате:
\`\`\`json
[{"title": "Название", "year": 2023, "type": "movie|animation|tv|anime", "reason": "Почему подойдёт сегодня"}]
\`\`\``
}

async function enrichWithTmdb(
  items: { title: string; year: number | null; type: string; reason: string }[]
): Promise<RecommendationCardData[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        // Try with year first for precision, then without for better recall
        let results = item.year ? await search(`${item.title} ${item.year}`) : []
        if (results.length === 0) {
          results = await search(item.title)
        }
        const match = results[0]
        // Use TMDB's normalized type when available — TMDB has actual genre+origin data
        // and can correct LLM mistakes (e.g. anime classified as animation)
        const resolvedType = match?.type ?? item.type
        return {
          // Use TMDB title (ru-RU) when found — avoids English names from LLM
          title: match?.title ?? item.title,
          year: item.year ?? match?.release_year ?? null,
          type: resolvedType,
          reason: item.reason,
          tmdbId: match?.tmdb_id ?? null,
          posterUrl: match?.poster_path ? buildPosterUrl(match.poster_path) : null,
        }
      } catch {
        return { title: item.title, year: item.year, type: item.type, reason: item.reason, tmdbId: null, posterUrl: null }
      }
    })
  )
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

    const userPrompt = buildUserPrompt(profileRow.summary, questionnaire, libraryContext)

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
          const jsonArrayStr = extractJsonArray(jsonBuffer)
          if (jsonArrayStr) {
            const rawItems = JSON.parse(jsonArrayStr) as {
              title: string
              year: number | null
              type: string
              reason: string
            }[]
            const cards = await enrichWithTmdb(rawItems)
            controller.enqueue(encoder.encode(CARDS_MARKER + JSON.stringify(cards) + '\n'))
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
