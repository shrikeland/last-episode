'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const NARUTO_ACCENT = '#E8873A'
const SASUKE_ACCENT = '#7C6FF7'

interface ThemeContextValue {
  isSasuke: boolean
  toggle: () => void
  accent: string
}

const ThemeContext = createContext<ThemeContextValue>({
  isSasuke: false,
  toggle: () => {},
  accent: NARUTO_ACCENT,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start with false (Naruto) to match SSR — useEffect syncs from localStorage after hydration.
  // CSS-палитру до гидрации уже выставил THEME_INIT_SCRIPT в app/layout.tsx
  const [isSasuke, setIsSasuke] = useState<boolean>(false)
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme-sasuke') === 'true'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSasuke(saved)
    setSynced(true)
  }, [])

  // Keep data-sasuke attribute and localStorage in sync with state. До синхронизации не пишем:
  // иначе первый прогон с false перебил бы атрибут из скрипта и мигнул палитрой Наруто
  useEffect(() => {
    if (!synced) return
    document.documentElement.setAttribute('data-sasuke', isSasuke ? 'true' : 'false')
    localStorage.setItem('theme-sasuke', String(isSasuke))
  }, [isSasuke, synced])

  const toggle = useCallback(() => setIsSasuke(p => !p), [])

  // Стабильный объект: иначе каждый ререндер провайдера перерисовывает всех useTheme()
  const value = useMemo(
    () => ({ isSasuke, toggle, accent: isSasuke ? SASUKE_ACCENT : NARUTO_ACCENT }),
    [isSasuke, toggle]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)