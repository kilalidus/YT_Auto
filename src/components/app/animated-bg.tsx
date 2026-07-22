'use client'

import { motion } from 'framer-motion'

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base gradient */}
      <div className="absolute inset-0 animated-gradient opacity-70" />
      {/* grid overlay */}
      <div className="absolute inset-0 bg-grid opacity-40" />

      {/* floating orbs */}
      <motion.div
        className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, oklch(0.7 0.24 350 / 0.25), transparent 70%)',
        }}
        animate={{
          x: [0, 60, 0],
          y: [0, 40, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, oklch(0.62 0.24 290 / 0.22), transparent 70%)',
        }}
        animate={{
          x: [0, -50, 0],
          y: [0, 60, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, oklch(0.68 0.22 200 / 0.2), transparent 70%)',
        }}
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[24rem] h-[24rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, oklch(0.72 0.18 160 / 0.15), transparent 70%)',
        }}
        animate={{
          x: [0, -60, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* tiny floating particles */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4 + (i % 4) * 3,
            height: 4 + (i % 4) * 3,
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            background:
              'radial-gradient(circle, oklch(0.8 0.2 350 / 0.6), transparent 70%)',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{
            duration: 6 + (i % 5),
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
