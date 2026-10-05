'use server'

import { createServerClient } from '@/lib/supabase/server'

/**
 * Выход на сервере: cookie сессии чистит серверный клиент. Так Navbar, который есть на каждой
 * странице приложения, не тянет в бандл @supabase/supabase-js (~36 KB gzip) ради одной кнопки.
 */
export async function signOut(): Promise<{ error?: true }> {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signOut()
  return error ? { error: true } : {}
}
