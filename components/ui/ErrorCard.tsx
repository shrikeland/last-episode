'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ErrorCardProps {
  title: string
  description: string
  reset: () => void
  backHref: string
  backLabel: string
}

export function ErrorCard({ title, description, reset, backHref, backLabel }: ErrorCardProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <div className="text-center space-y-4 max-w-md px-4">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="outline">
            Попробовать снова
          </Button>
          <Button asChild variant="ghost">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
