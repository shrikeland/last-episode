import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { RecommendationsPage } from '@/components/recommendations/RecommendationsPage'
import type { TasteProfile } from '@/types/recommendations'

export const dynamic = 'force-dynamic'

export default async function RecommendationsRoute() {
  const user = await getServerUser()
  if (!user) return null

  const supabase = await createServerClient()

  // Count media items
  const { count } = await supabase
    .from('media_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Load taste profile (table added via migration)
  const { data: profileRow } = await supabase
    .from('taste_profiles')
    .select('summary, updated_at')
    .eq('user_id', user.id)
    .single()

  const profile: TasteProfile | null = profileRow
    ? { summary: profileRow.summary, updated_at: profileRow.updated_at }
    : null

  return (
    <RecommendationsPage
      initialProfile={profile}
      itemCount={count ?? 0}
    />
  )
}
