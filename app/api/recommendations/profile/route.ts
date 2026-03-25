import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getMediaItems } from '@/lib/supabase/media'
import { generate } from '@/lib/groq/groq.service'

const SYSTEM_PROMPT = `You are analyzing a user's media library to create a concise, personal taste profile.
Write in Russian. Be specific and insightful — this profile will be used to generate personalized watch recommendations.`

function buildUserPrompt(items: { title: string; type: string; status: string; rating: number | null; genres: string[] }[]): string {
  const rows = items
    .map((i) => {
      const rating = i.rating != null ? `${i.rating}/10` : 'без оценки'
      const genres = i.genres.length > 0 ? i.genres.join(', ') : '—'
      return `• ${i.title} (${i.type}) — ${i.status}, рейтинг: ${rating}, жанры: ${genres}`
    })
    .join('\n')

  return `Вот библиотека пользователя (${items.length} тайтлов):\n${rows}

Составь профиль вкусов (150–250 слов) на русском языке, который описывает:
1. Какие жанры и темы пользователь явно любит
2. Предпочтения по темпу, настроению, стилю (опираясь на оцененные тайтлы)
3. Паттерны — что бросал, что досматривал до конца
4. Какой тип контента (фильмы, сериалы, аниме) преобладает

Будь конкретным и личным. Не перечисляй тайтлы списком — формулируй выводы.`
}

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const items = await getMediaItems(supabase, user.id)

    if (items.length < 5) {
      return NextResponse.json(
        { error: 'not_enough_items', message: 'Нужно минимум 5 тайтлов в библиотеке' },
        { status: 400 }
      )
    }

    const simplified = items.map((i) => ({
      title: i.title,
      type: i.type,
      status: i.status,
      rating: i.rating,
      genres: i.genres as string[],
    }))

    const summary = await generate(SYSTEM_PROMPT, buildUserPrompt(simplified))

    // Upsert taste profile
    const { error: upsertError } = await supabase
      .from('taste_profiles')
      .upsert({ user_id: user.id, summary, updated_at: new Date().toISOString() }, {
        onConflict: 'user_id',
      })

    if (upsertError) throw upsertError

    return NextResponse.json({ summary, updated_at: new Date().toISOString() })
  } catch (err) {
    console.error('[recommendations/profile]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'server_error', message }, { status: 500 })
  }
}
