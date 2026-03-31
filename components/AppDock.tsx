'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Film, PlusCircle, BarChart2, Sparkles, Users, User, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'
import Dock, { type DockItemData } from '@/components/ui/Dock'

const ICON_SIZE = 20

interface AppDockProps {
  username: string
  pendingRequestsCount?: number
}

export function AppDock({ username, pendingRequestsCount = 0 }: AppDockProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient()

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Не удалось выйти')
      return
    }
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const items: DockItemData[] = [
    {
      icon: <Film size={ICON_SIZE} className={isActive('/library') ? 'text-primary' : 'text-[#8899AA]'} />,
      label: 'Библиотека',
      onClick: () => router.push('/library'),
      isActive: isActive('/library'),
    },
    {
      icon: <PlusCircle size={ICON_SIZE} className={isActive('/search') ? 'text-primary' : 'text-[#8899AA]'} />,
      label: 'Добавить',
      onClick: () => router.push('/search'),
      isActive: isActive('/search'),
    },
    {
      icon: <BarChart2 size={ICON_SIZE} className={isActive('/stats') ? 'text-primary' : 'text-[#8899AA]'} />,
      label: 'Статистика',
      onClick: () => router.push('/stats'),
      isActive: isActive('/stats'),
    },
    {
      icon: <Sparkles size={ICON_SIZE} className={isActive('/recommendations') ? 'text-primary' : 'text-[#8899AA]'} />,
      label: 'Для тебя',
      onClick: () => router.push('/recommendations'),
      isActive: isActive('/recommendations'),
    },
    {
      icon: (
        <div className="relative">
          <Users size={ICON_SIZE} className={isActive('/community') ? 'text-primary' : 'text-[#8899AA]'} />
          {pendingRequestsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
              {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
            </span>
          )}
        </div>
      ),
      label: 'Сообщество',
      onClick: () => router.push('/community'),
      isActive: isActive('/community'),
    },
    {
      icon: <User size={ICON_SIZE} className={isActive(`/profile/${username}`) ? 'text-primary' : 'text-[#8899AA]'} />,
      label: `@${username}`,
      onClick: () => router.push(`/profile/${username}`),
      isActive: isActive(`/profile/${username}`),
    },
    {
      icon: <LogOut size={ICON_SIZE} className="text-[#8899AA]" />,
      label: 'Выйти',
      onClick: handleSignOut,
    },
  ]

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-3 pointer-events-none">
      <div className="pointer-events-auto">
        <Dock items={items} />
      </div>
    </div>
  )
}