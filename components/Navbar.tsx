'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import TrueFocus from '@/components/ui/TrueFocus'

interface NavbarProps {
  username: string
  pendingRequestsCount?: number
}

export function Navbar({ username, pendingRequestsCount: _pendingRequestsCount = 0 }: NavbarProps) {
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

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-sm"
      data-testid="navbar"
    >
      <div className="container max-w-7xl mx-auto px-4">
        <div className="relative flex h-16 items-center">
          {/* Logo — centered */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <Link
              href="/library"
              className="no-underline"
              data-testid="navbar-logo"
              aria-label="На главную"
            >
              <TrueFocus
                sentence="LAST EPISODE"
                manualMode={true}
                blurAmount={2}
                animationDuration={0.3}
              />
            </Link>
          </div>

          {/* Right: username + logout */}
          <div className="ml-auto flex items-center gap-3">
            <Link
              href={`/profile/${username}`}
              className="hidden sm:block text-sm text-muted-foreground truncate max-w-[160px] hover:text-foreground transition-colors"
              data-testid="navbar-username"
            >
              @{username}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-muted-foreground hover:text-foreground"
              data-testid="navbar-signout-button"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}