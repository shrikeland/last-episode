'use client'

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion'
import React, { Children, cloneElement, useEffect, useRef, useState } from 'react'

export type DockItemData = {
  icon: React.ReactNode
  label: React.ReactNode
  onClick: () => void
  className?: string
  isActive?: boolean
}

export type DockProps = {
  items: DockItemData[]
  className?: string
  distance?: number
  panelHeight?: number
  baseItemSize?: number
  dockHeight?: number
  magnification?: number
  spring?: SpringOptions
}

type DockItemProps = {
  className?: string
  children: React.ReactNode
  onClick?: () => void
  mouseX: MotionValue<number>
  spring: SpringOptions
  distance: number
  baseItemSize: number
  magnification: number
  isActive?: boolean
}

function DockItem({
  children,
  className = '',
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  isActive,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isHovered = useMotionValue(0)

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize }
    return val - rect.x - baseItemSize / 2
  })

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize])
  const size = useSpring(targetSize, spring)

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full border-2 shadow-md cursor-pointer transition-colors ${
        isActive
          ? 'bg-primary/15 border-primary/60'
          : 'bg-[#1E2A3A] border-[#2D3F55] hover:border-primary/40'
      } ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="false"
    >
      {Children.map(children, child =>
        React.isValidElement(child)
          ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number> }>, { isHovered })
          : child
      )}
    </motion.div>
  )
}

type DockLabelProps = {
  className?: string
  children: React.ReactNode
  isHovered?: MotionValue<number>
}

function DockLabel({ children, className = '', isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isHovered) return
    const unsubscribe = isHovered.on('change', latest => setIsVisible(latest === 1))
    return () => unsubscribe()
  }, [isHovered])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.15 }}
          className={`${className} absolute -top-8 left-1/2 w-fit whitespace-pre rounded-md border border-[#2D3F55] bg-[#1E2A3A] px-2 py-0.5 text-xs text-[#F0F4F8]`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type DockIconProps = {
  className?: string
  children: React.ReactNode
  isHovered?: MotionValue<number>
}

function DockIcon({ children, className = '' }: DockIconProps) {
  return <div className={`flex items-center justify-center ${className}`}>{children}</div>
}

export { DockLabel, DockIcon }

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 200, damping: 22 },
  magnification = 52,
  distance = 140,
  panelHeight = 60,
  dockHeight = 240,
  baseItemSize = 46,
}: DockProps) {
  const mouseX = useMotionValue(Infinity)

  return (
    <div style={{ overflow: 'visible' }} className="flex max-w-full items-center justify-center">
      <motion.div
        onMouseMove={({ clientX }) => {
          mouseX.set(clientX)
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity)
        }}
        className={`${className} flex items-end w-fit gap-3 rounded-2xl border border-[#2D3F55] bg-[#0D1117]/90 backdrop-blur-md pb-2 px-4`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Навигация"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            isActive={item.isActive}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </div>
  )
}