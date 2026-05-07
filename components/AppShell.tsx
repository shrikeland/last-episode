'use client'

import { useTheme } from '@/contexts/ThemeContext'
import LightRays from '@/components/LightRays.jsx'
import ClickSpark from '@/components/ui/ClickSpark'
import type { ReactNode } from 'react'

export default function AppShell({ children }: { children: ReactNode }) {
  const { accent } = useTheme()

  return (
    <ClickSpark sparkColor={accent}>
      <div className="relative min-h-screen bg-background">
        {/* WebGL light rays */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <LightRays
            raysColor={accent}
            raysOrigin="top-center"
            raysSpeed={1}
            lightSpread={0.5}
            rayLength={2.5}
            fadeDistance={1}
            mouseInfluence={0.12}
            followMouse
          />
        </div>
        {children}
      </div>
    </ClickSpark>
  )
}