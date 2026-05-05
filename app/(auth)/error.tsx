'use client'

import { useEffect } from 'react'
import { ErrorCard } from '@/components/ui/ErrorCard'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorCard
      title="Ошибка аутентификации"
      description="Не удалось выполнить действие. Попробуй снова."
      reset={reset}
      backHref="/login"
      backLabel="На страницу входа"
    />
  )
}
