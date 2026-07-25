'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * Dashboard page-transition template (iOS 26 concept branch).
 *
 * Next.js remounts a template on every route change within the segment,
 * so each tab click replays this enter animation: the incoming screen
 * slides up and settles, like a swiped iOS push. Apple sheet easing.
 * Degrades to a plain render under prefers-reduced-motion.
 */
const APPLE_EASE = [0.32, 0.72, 0, 1] as const

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: APPLE_EASE }}
    >
      {children}
    </motion.div>
  )
}
