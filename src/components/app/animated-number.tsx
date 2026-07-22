'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  delay?: number
  format?: (n: number) => string
  className?: string
}

/**
 * Counts up from 0 to `value` over `duration` ms using requestAnimationFrame
 * with an ease-out cubic curve. Re-runs when `value` changes. Optional `delay` (ms).
 */
export function AnimatedNumber({
  value,
  duration = 1200,
  delay = 0,
  format = (n) => Math.round(n).toString(),
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      fromRef.current = 0
      startRef.current = null
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

      const step = (ts: number) => {
        if (startRef.current === null) startRef.current = ts
        const elapsed = ts - startRef.current
        const progress = Math.min(elapsed / duration, 1)
        const eased = easeOutCubic(progress)
        const current = fromRef.current + (value - fromRef.current) * eased
        setDisplay(current)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          setDisplay(value)
        }
      }

      rafRef.current = requestAnimationFrame(step)
    }, delay)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, delay])

  return <span className={className}>{format(display)}</span>
}
