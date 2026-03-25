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
Не пиши ничего после JSON-массива. Используй только типы: movie, tv, anime.
В поле "title" используй официальное русское название тайтла (как оно известно в России). Если русского названия нет — используй оригинальное.
Строго соблюдай запрет на рекомендации тайтлов из библиотеки пользователя.`

function buildUserPrompt(
  summary: string,
  answers: QuestionnaireAnswers,
  libraryContext: string
): string {
  const exclusionsText =
    answers.exclusions.length > 0 ? answers.exclusions.join(', ') : 'нет ограничений'

  const contentTypeLabels: Record<string, string> = {
    movie: 'фильм',
    animation: 'мультфильм',
    tv: 'сериал',
    anime: 'аниме',
    any: 'любой тип',
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
- Что хочу посмотреть: ${contentTypeLabels[answers.contentType] ?? answers.contentType}
- Настроение: ${answers.mood}
- Исключения: ${exclusionsText}
- Из чего выбирать: ${familiarityLabels[answers.familiarity] ?? answers.familiarity}

Подбери топ-5 рекомендаций. Сначала вступление (2–3 предложения), потом строго в формате:
\`\`\`json
[{"title": "Название", "year": 2023, "type": "movie|tv|anime", "reason": "Почему подойдёт сегодня"}]
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
        return {
          // Use TMDB title (ru-RU) when found — avoids English names from LLM
          title: match?.title ?? item.title,
          year: item.year ?? match?.release_year ?? null,
          type: item.type,
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
        let sseBuffer = ''
        let introAccumulated = ''
        let introAlreadySent = 0  // chars already flushed to client
        let jsonBuffer = ''
        let introSent = false

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
                const markerIdx = introAccumulated.indexOf('```json')
                if (markerIdx !== -1) {
                  // Only send the unsent portion of intro before the marker
                  const unsent = introAccumulated.slice(introAlreadySent, markerIdx).trimEnd()
                  if (unsent) controller.enqueue(encoder.encode(unsent))
                  controller.enqueue(encoder.encode(INTRO_DONE_MARKER))
                  introSent = true
                  // Collect whatever came after ```json in this chunk
                  jsonBuffer = introAccumulated.slice(markerIdx + '```json'.length)
                } else {
                  // Still streaming intro — send chunk to client
                  controller.enqueue(encoder.encode(content))
                  introAlreadySent += content.length
                }
              } else {
                jsonBuffer += content
              }
            }
          }

          // Groq stream finished — parse JSON and enrich
          const jsonMatch = jsonBuffer.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const rawItems = JSON.parse(jsonMatch[0]) as {
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
