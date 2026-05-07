import { redirect } from 'next/navigation'
import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { Navbar } from '@/components/Navbar'
import { AppDock } from '@/components/AppDock'
import { ModeSwitcher } from '@/components/ModeSwitcher'
import { getPendingCount } from '@/app/actions/friends'
import AppShell from '@/components/AppShell'

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
    <AppShell>
      <div className="grain-overlay" />
      <div className="flex min-h-screen flex-col relative z-10">
        <Navbar username={username} pendingRequestsCount={pendingCount} />
        <main className="flex-1 max-w-[1100px] w-full mx-auto px-6 py-7 pb-28">
          {children}
        </main>
        <AppDock username={username} pendingRequestsCount={pendingCount} />
        <ModeSwitcher />
      </div>
    </AppShell>
  )
}