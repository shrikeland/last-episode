'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { User, LogOut } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import TrueFocus from '@/components/ui/TrueFocus'
import { useTheme } from '@/contexts/ThemeContext'

interface NavbarProps {
  username: string
  pendingRequestsCount?: number
}

function UserMenu({ username, accent }: { username: string; accent: string }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Не удалось выйти')
      return
    }
    router.push('/login')
    router.refresh()
  }

  const initial = (username[0] ?? 'U').toUpperCase()

  return (
    <div ref={menuRef} className="relative" data-testid="user-menu">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center outline-none transition-all duration-200"
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: open
            ? `linear-gradient(135deg, ${accent}, ${accent}99)`
            : 'rgba(30,45,65,0.9)',
          border: `1.5px solid ${open ? accent : 'rgba(45,63,85,0.8)'}`,
          boxShadow: open ? `0 0 16px ${accent}50` : 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        aria-label="Меню аккаунта"
        data-testid="avatar-button"
      >
        <span
          className="text-xs font-bold"
          style={{ color: open ? 'white' : 'hsl(210 25% 59%)' }}
        >
          {initial}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 border rounded-xl overflow-hidden"
          style={{
            top: 'calc(100% + 10px)',
            minWidth: 196,
            background: 'rgba(10,20,32,0.97)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(45,63,85,0.8)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)',
            animation: 'menuIn 0.14s cubic-bezier(0.34,1.56,0.64,1) forwards',
            transformOrigin: 'top right',
            zIndex: 300,
          }}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center text-xs font-bold text-white rounded-full flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  background: `linear-gradient(135deg, ${accent}, ${accent}80)`,
                }}
              >
                {initial}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-foreground">{username}</div>
                <div className="text-[11px] text-muted-foreground">@{username}</div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="p-1.5">
            <Link
              href={`/profile/${username}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-foreground transition-colors hover:text-foreground"
              style={{ textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = `${accent}15`)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              data-testid="menu-profile-link"
            >
              <User className="h-3.5 w-3.5 opacity-70" />
              Профиль
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors text-left"
              style={{ color: '#EF5555', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,85,85,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              data-testid="navbar-signout-button"
            >
              <LogOut className="h-3.5 w-3.5 opacity-80" />
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Navbar({ username, pendingRequestsCount: _pendingRequestsCount = 0 }: NavbarProps) {
  const { accent } = useTheme()

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: 'rgba(7,13,22,0.88)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid hsl(213 44% 16%)',
      }}
      data-testid="navbar"
    >

      <div className="max-w-[1100px] mx-auto px-6 h-[58px] flex items-center relative">
        {/* Logo — centered */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link href="/library" className="no-underline" aria-label="На главную" data-testid="navbar-logo">
            <TrueFocus
              sentence="LAST EPISODE"
              manualMode
              blurAmount={2}
              borderColor={accent}
              glowColor={`${accent}99`}
              animationDuration={0.3}
            />
          </Link>
        </div>

        {/* Right: avatar dropdown */}
        <div className="ml-auto">
          <UserMenu username={username} accent={accent} />
        </div>
      </div>
    </header>
  )
}