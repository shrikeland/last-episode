'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

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
  // Always start with false (Naruto) to match SSR — useEffect syncs from localStorage after hydration
  const [isSasuke, setIsSasuke] = useState<boolean>(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme-sasuke') === 'true'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSasuke(saved)
  }, [])

  // Keep data-sasuke attribute and localStorage in sync with state
  useEffect(() => {
    document.documentElement.setAttribute('data-sasuke', isSasuke ? 'true' : 'false')
    localStorage.setItem('theme-sasuke', String(isSasuke))
  }, [isSasuke])

  const toggle = useCallback(() => setIsSasuke(p => !p), [])

  return (
    <ThemeContext.Provider
      value={{
        isSasuke,
        toggle,
        accent: isSasuke ? SASUKE_ACCENT : NARUTO_ACCENT,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)