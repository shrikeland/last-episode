'use client'

import { useEffect } from 'react'
import { ErrorCard } from '@/components/ui/ErrorCard'

export default function AppError({
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
      title="Что-то пошло не так"
      description="Не удалось загрузить страницу. Попробуй снова или вернись в библиотеку."
      reset={reset}
      backHref="/library"
      backLabel="В библиотеку"
    />
  )
}
