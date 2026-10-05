import { createServerClient as _createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Database } from '@/types'

// Server client — для Server Components и Server Actions
export async function createServerClient() {
  const cookieStore = await cookies()

  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — set не поддерживается, игнорируем
          }
        },
      },
    }
  )
}

/** То, что приложению нужно от пользователя сессии: id везде, email — fallback имени в навбаре. */
export type AuthUser = {
  id: string
  email: string | null
}

/**
 * Возвращает текущего авторизованного пользователя.
 * getClaims() проверяет подпись JWT локально по JWKS проекта (ES256, кэш на инстанс 10 мин) —
 * без запроса к Supabase Auth; при HS256 сам откатывается на getUser().
 * React.cache() гарантирует одну проверку на всё render-дерево запроса
 * (layout + page + все server actions в пределах одного рендера).
 */
export const getServerUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  return { id: claims.sub, email: claims.email ?? null }
})