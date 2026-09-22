'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Неверный email или пароль'
  if (message.includes('Email not confirmed')) return 'Подтвердите email перед входом'
  if (message.includes('User not found')) return 'Пользователь не найден'
  return 'Проблема с соединением. Попробуйте снова'
}

// Тост после перехода по ссылке из письма подтверждения (см. app/auth/callback/route.ts).
// Фиксированный id — чтобы двойной вызов эффекта в StrictMode не показал два тоста;
// параметр убираем из URL, чтобы тост не повторялся при перезагрузке.
function EmailConfirmationToast() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const confirmed = searchParams.get('confirmed')
  const error = searchParams.get('error')

  useEffect(() => {
    if (confirmed) {
      toast.success('Почта подтверждена, можете входить', { id: 'email-confirmation' })
    } else if (error === 'confirmation_failed') {
      toast.error('Ссылка устарела или уже использована. Попробуйте войти', {
        id: 'email-confirmation',
      })
    } else {
      return
    }
    router.replace('/login')
  }, [confirmed, error, router])

  return null
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(mapAuthError(error.message))
      } else {
        router.push('/library')
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md" data-testid="login-card">
      <Suspense fallback={null}>
        <EmailConfirmationToast />
      </Suspense>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Добро пожаловать
        </CardTitle>
        <CardDescription>
          Войдите, чтобы открыть свою коллекцию
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              data-testid="login-email-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                data-testid="login-password-input"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="login-submit-button"
          >
            {isLoading ? 'Входим...' : 'Войти'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Нет аккаунта?{' '}
          <Link
            href="/register"
            className="text-primary hover:underline font-medium"
            data-testid="login-register-link"
          >
            Зарегистрируйтесь
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}