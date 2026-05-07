'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export function ModeSwitcher() {
  const { isSasuke, toggle, accent } = useTheme()
  const [hovered, setHovered] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      <div className="relative">
        {hovered && (
          <div
            className="absolute bottom-[calc(100%+8px)] right-0 whitespace-nowrap text-[11px] text-foreground rounded-lg px-2.5 py-1 border border-border/60 pointer-events-none"
            style={{
              background: 'rgba(14,29,45,0.96)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              animation: 'menuIn 0.12s ease forwards',
              transformOrigin: 'bottom right',
            }}
          >
            {isSasuke ? 'Режим Саске' : 'Режим Наруто'}
          </div>
        )}

        <button
          onClick={toggle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="flex items-center justify-center outline-none"
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            border: `1.5px solid ${accent}88`,
            background: 'rgba(13,26,40,0.88)',
            backdropFilter: 'blur(24px)',
            cursor: 'pointer',
            padding: 0,
            boxShadow: `0 0 0 4px ${accent}18, 0 8px 28px rgba(0,0,0,0.65), 0 0 16px ${accent}28`,
            transition: 'border-color 0.3s, box-shadow 0.3s',
            overflow: 'hidden',
          }}
          aria-label={isSasuke ? 'Режим Саске' : 'Режим Наруто'}
        >
          <div className="relative w-9 h-9">
            <Image
              src="/naruto-icon.png"
              alt="Naruto"
              fill
              className="object-contain"
              style={{
                opacity: isSasuke ? 0 : 1,
                transform: isSasuke ? 'scale(0.7) rotate(-15deg)' : 'scale(1) rotate(0deg)',
                transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
            <Image
              src="/sasuke-icon.png"
              alt="Sasuke"
              fill
              className="object-contain"
              style={{
                opacity: isSasuke ? 1 : 0,
                transform: isSasuke ? 'scale(1) rotate(0deg)' : 'scale(0.7) rotate(15deg)',
                transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
          </div>
        </button>
      </div>
    </div>
  )
}