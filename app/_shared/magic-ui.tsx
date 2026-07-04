'use client'

/**
 * Magic UI components (adapted from magicui.design, MIT) tuned to the cg
 * design system, dependency-free beyond framer-motion (already a project
 * dependency). Shared across dashboards - not admin-specific like
 * app/admin/_components/magic.tsx's ambient effects.
 */

import React, { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'

/** Counts up from 0 to `value` once it scrolls into view. */
export function NumberTicker({
  value,
  decimalPlaces = 0,
  className = '',
}: {
  value: number
  decimalPlaces?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px' })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })

  useEffect(() => {
    if (inView) motionValue.set(value)
  }, [inView, value, motionValue])

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)))
      }
    })
  }, [springValue, decimalPlaces])

  return <span ref={ref} className={className}>0</span>
}

/** Circular gauge that animates its fill to `value`/`max` on mount. */
export function AnimatedCircularProgressBar({
  value,
  max = 100,
  min = 0,
  gaugePrimaryColor = '#4f46e5',
  gaugeSecondaryColor = '#e5e7eb',
  size = 96,
  strokeWidth = 9,
  className = '',
  children,
}: {
  value: number
  max?: number
  min?: number
  gaugePrimaryColor?: string
  gaugeSecondaryColor?: string
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
}) {
  const pct = Math.min(100, Math.max(0, max === min ? 0 : ((value - min) / (max - min)) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={gaugeSecondaryColor} strokeWidth={strokeWidth} fill="none"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={gaugePrimaryColor} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
