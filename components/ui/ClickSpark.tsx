'use client'

import React, { useRef, useEffect, useCallback } from 'react'

interface ClickSparkProps {
  sparkColor?: string
  sparkSize?: number
  sparkRadius?: number
  sparkCount?: number
  duration?: number
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  extraScale?: number
  children?: React.ReactNode
}

interface Spark {
  x: number
  y: number
  angle: number
  startTime: number
}

const ClickSpark: React.FC<ClickSparkProps> = ({
  sparkColor = '#E67E22',
  sparkSize = 10,
  sparkRadius = 20,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1.2,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sparksRef = useRef<Spark[]>([])
  const animationIdRef = useRef<number | null>(null)
  const drawRef = useRef<(timestamp: number) => void>(() => {})

  // Canvas размером с экран (fixed), а не со всю страницу: на длинной библиотеке
  // полностраничный canvas весил десятки мегабайт и очищался каждый кадр
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case 'linear': return t
        case 'ease-in': return t * t
        case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        default: return t * (2 - t) // ease-out
      }
    },
    [easing]
  )

  // Цикл крутится только пока есть искры: стартует по клику, останавливается, когда все догорели
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      sparksRef.current = sparksRef.current.filter((spark: Spark) => {
        const elapsed = timestamp - spark.startTime
        if (elapsed >= duration) return false

        const progress = elapsed / duration
        const eased = easeFunc(progress)
        const distance = eased * sparkRadius * extraScale
        const lineLength = sparkSize * (1 - eased)

        const x1 = spark.x + distance * Math.cos(spark.angle)
        const y1 = spark.y + distance * Math.sin(spark.angle)
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle)
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle)

        ctx.strokeStyle = sparkColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()

        return true
      })

      animationIdRef.current =
        sparksRef.current.length > 0 ? requestAnimationFrame(draw) : null
    }

    drawRef.current = draw
    return () => {
      if (animationIdRef.current !== null) cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
  }, [sparkColor, sparkSize, sparkRadius, duration, easeFunc, extraScale])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const now = performance.now()
    const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
      x: e.clientX,
      y: e.clientY,
      angle: (2 * Math.PI * i) / sparkCount,
      startTime: now,
    }))

    sparksRef.current.push(...newSparks)
    if (animationIdRef.current === null) {
      animationIdRef.current = requestAnimationFrame(drawRef.current)
    }
  }

  return (
    <div className="relative w-full min-h-screen" onClick={handleClick}>
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
      {children}
    </div>
  )
}

export default ClickSpark