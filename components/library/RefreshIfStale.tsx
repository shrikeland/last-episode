'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { consumeLibraryStale } from '@/lib/library-stale'

/** Перезапрашивает библиотеку, если её данные поменялись на другой странице (см. lib/library-stale.ts). */
export function RefreshIfStale() {
  const router = useRouter()

  useEffect(() => {
    if (consumeLibraryStale()) router.refresh()
  }, [router])

  return null
}
