'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-4">
        <h2 className="text-xl font-semibold text-foreground">Что-то пошло не так</h2>
        <p className="text-sm text-muted-foreground">
          Произошла непредвиденная ошибка. Попробуй обновить страницу.
        </p>
        <Button onClick={reset} variant="outline">
          Попробовать снова
        </Button>
      </div>
    </div>
  )
}
