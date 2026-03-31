'use server'

import * as MediaService from '@/lib/supabase/media'
import { createServerClient, getServerUser } from '@/lib/supabase/server'

export async function deleteMediaItem(id: string): Promise<{ error?: string }> {
  const user = await getServerUser()
  if (!user) return { error: 'Не авторизован' }

  const supabase = await createServerClient()

  try {
    await MediaService.deleteMediaItem(supabase, id, user.id)
    return {}
  } catch {
    return { error: 'Не удалось удалить' }
  }
}