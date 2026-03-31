import { redirect } from 'next/navigation'
import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { AppDock } from '@/components/AppDock'
import { getPendingCount } from '@/app/actions/friends'
import ClickSpark from '@/components/ui/ClickSpark'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createServerClient()
  const [profileResult, pendingCount] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    getPendingCount(),
  ])

  const username = profileResult.data?.username ?? user.email ?? ''

  return (
    <ClickSpark>
      <div className="flex min-h-screen flex-col">
        <Navbar username={username} pendingRequestsCount={pendingCount} />
        <main className="flex-1 container max-w-7xl mx-auto px-4 py-8 pb-28">
          {children}
        </main>
        <AppDock username={username} pendingRequestsCount={pendingCount} />
      </div>
    </ClickSpark>
  )
}