'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Film, PlusCircle, BarChart2, LogOut, Users, Sparkles, Menu, X, User } from 'lucide-react'

const NAV_LINKS = [
  { href: '/library', label: 'Библиотека', icon: Film },
  { href: '/search', label: 'Добавить', icon: PlusCircle },
  { href: '/stats', label: 'Статистика', icon: BarChart2 },
  { href: '/recommendations', label: 'Для тебя', icon: Sparkles },
  { href: '/community', label: 'Сообщество', icon: Users },
] as const

interface NavbarProps {
  username: string
}

export function Navbar({ username }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Не удалось выйти')
      return
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm"
      data-testid="navbar"
    >
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/library"
            className="text-xl font-bold tracking-widest text-primary hover:text-primary/90 transition-colors"
            data-testid="navbar-logo"
          >
            LAST EPISODE
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1" data-testid="navbar-links">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                data-testid={`navbar-link-${href.replace('/', '')}`}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-accent/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Desktop: username + logout */}
            <Link
              href={`/profile/${username}`}
              className="hidden md:block text-sm text-muted-foreground truncate max-w-[160px] hover:text-foreground transition-colors"
              data-testid="navbar-username"
            >
              @{username}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="hidden md:flex gap-2 text-muted-foreground hover:text-foreground"
              data-testid="navbar-signout-button"
            >
              <LogOut className="h-4 w-4" />
              <span>Выйти</span>
            </Button>

            {/* Mobile: hamburger */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Меню"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-sm">
          <nav className="container max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors',
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-accent/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
            <div className="my-1 border-t border-border" />
            <Link
              href={`/profile/${username}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <User className="h-5 w-5" />
              @{username}
            </Link>
            <button
              onClick={() => { setMobileMenuOpen(false); handleSignOut() }}
              className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left"
            >
              <LogOut className="h-5 w-5" />
              Выйти
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}