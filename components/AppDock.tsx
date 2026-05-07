'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Film, Search, BarChart2, Sparkles, Users } from 'lucide-react'
import Dock, { type DockItemData } from '@/components/ui/Dock'
import { useTheme } from '@/contexts/ThemeContext'

const ICON_SIZE = 20

interface AppDockProps {
  username: string
  pendingRequestsCount?: number
}

export function AppDock({ username: _username, pendingRequestsCount = 0 }: AppDockProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { accent } = useTheme()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const items: DockItemData[] = [
    {
      icon: (
        <Film
          size={ICON_SIZE}
          style={{ color: isActive('/library') ? accent : 'hsl(210 14% 60%)' }}
        />
      ),
      label: 'Библиотека',
      onClick: () => router.push('/library'),
      isActive: isActive('/library'),
    },
    {
      icon: (
        <Search
          size={ICON_SIZE}
          style={{ color: isActive('/search') ? accent : 'hsl(210 14% 60%)' }}
        />
      ),
      label: 'Найти',
      onClick: () => router.push('/search'),
      isActive: isActive('/search'),
    },
    {
      icon: (
        <BarChart2
          size={ICON_SIZE}
          style={{ color: isActive('/stats') ? accent : 'hsl(210 14% 60%)' }}
        />
      ),
      label: 'Статистика',
      onClick: () => router.push('/stats'),
      isActive: isActive('/stats'),
    },
    {
      icon: (
        <Sparkles
          size={ICON_SIZE}
          style={{ color: isActive('/recommendations') ? accent : 'hsl(210 14% 60%)' }}
        />
      ),
      label: 'Для тебя',
      onClick: () => router.push('/recommendations'),
      isActive: isActive('/recommendations'),
    },
    {
      icon: (
        <div className="relative">
          <Users
            size={ICON_SIZE}
            style={{ color: isActive('/community') ? accent : 'hsl(210 14% 60%)' }}
          />
          {pendingRequestsCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ background: accent }}
            >
              {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
            </span>
          )}
        </div>
      ),
      label: 'Сообщество',
      onClick: () => router.push('/community'),
      isActive: isActive('/community'),
    },
  ]

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-3 pointer-events-none">
      <div className="pointer-events-auto">
        <Dock items={items} accent={accent} />
      </div>
    </div>
  )
}