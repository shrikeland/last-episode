'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

function getUsernameError(value: string): string | null {
  if (!value) return null
  if (/\s/.test(value)) return 'Пробелы не допускаются — используй _ вместо пробела'
  if (!/^[a-z0-9_]+$/.test(value)) return 'Только латинские буквы a–z, цифры 0–9 и символ _'
  if (value.length < 3) return 'Минимум 3 символа'
  return null
}

function mapAuthError(message: string): string {
  if (message.includes('User already registered')) return 'Пользователь с таким email уже существует'
  if (message.includes('Password should be at least')) return 'Пароль должен содержать минимум 6 символов'
  if (message.includes('duplicate') || message.includes('unique') || message.includes('profiles')) return 'Этот логин уже занят'
  return 'Не удалось создать аккаунт. Попробуйте снова'
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!USERNAME_REGEX.test(username)) {
      toast.error('Логин: 3–20 символов, только a-z, 0-9 и _')
      return
    }
    if (password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      })
      if (error) {
        toast.error(mapAuthError(error.message))
      } else if (!data.session) {
        toast.info('Проверьте email для подтверждения регистрации')
      } else {
        toast.success('Аккаунт создан!')
        router.push('/library')
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md" data-testid="register-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Создать аккаунт
        </CardTitle>
        <CardDescription>
          Начните отслеживать свои фильмы и сериалы
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
          <div className="space-y-2">
            <Label htmlFor="username">Логин</Label>
            <Input
              id="username"
              type="text"
              placeholder="например: ivan_petrov"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              autoComplete="username"
              data-testid="register-username-input"
              className={getUsernameError(username) ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {getUsernameError(username) ? (
              <p className="text-xs text-destructive">
                {getUsernameError(username)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                По нему вас найдут другие — как username в Telegram
              </p>
            )}
          </div>

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
              data-testid="register-email-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                data-testid="register-password-input"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Повторите пароль</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                data-testid="register-confirm-password-input"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="register-submit-button"
          >
            {isLoading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
            data-testid="register-login-link"
          >
            Войти
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}