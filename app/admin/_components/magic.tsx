'use client'

/**
 * Magic UI-style effects (adapted from magicui.design, MIT) tuned to the
 * cg design system. BorderBeam sends a glint of light traveling around a
 * card's frame. Parent must be `relative overflow-hidden rounded-*`.
 * Hidden automatically when the browser lacks offset-path rect() support
 * (see .cg-border-beam guard in globals.css) or reduced motion is on.
 */

import { motion, useReducedMotion } from 'framer-motion'

export function BorderBeam({
 size = 130,
 duration = 10,
 delay = 0,
 colorFrom = '#38bdf8',
 colorTo = '#6366f1',
 reverse = false,
}: {
 size?: number
 duration?: number
 delay?: number
 colorFrom?: string
 colorTo?: string
 reverse?: boolean
}) {
 const reduce = useReducedMotion()
 if (reduce) return null
 return (
  <div
   aria-hidden
   className="cg-border-beam pointer-events-none absolute inset-0 rounded-[inherit] [border:1px_solid_transparent] [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
  >
   <motion.div
    className="absolute aspect-square"
    style={{
     width: size,
     offsetPath: `rect(0 auto auto 0 round ${size}px)`,
     background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
    }}
    initial={{ offsetDistance: reverse ? '100%' : '0%' }}
    animate={{ offsetDistance: reverse ? ['100%', '0%'] : ['0%', '100%'] }}
    transition={{ repeat: Infinity, ease: 'linear', duration, delay: -delay }}
   />
  </div>
 )
}
