'use client'

import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TiltCardProps {
  children: ReactNode
  className?: string
  max?: number
  glow?: boolean
}

/**
 * 3D tilt card that tracks mouse position and applies a subtle perspective tilt.
 * Uses CSS variables --rx/--ry consumed by the .tilt-card utility class.
 */
export function TiltCard({ children, className, max = 8, glow = true }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [rx, setRx] = useState(0)
  const [ry, setRy] = useState(0)

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setRx(x * max)
    setRy(-y * max)
  }

  const handleLeave = () => {
    setRx(0)
    setRy(0)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={
        {
          '--rx': `${rx}deg`,
          '--ry': `${ry}deg`,
        } as React.CSSProperties
      }
      className={cn('tilt-card relative', glow && 'glow-border', className)}
    >
      {children}
    </div>
  )
}
