"use client"

import React from 'react'
import { motion } from 'framer-motion'

interface SilkRibbonProps {
  className?: string
  speed?: number
  amplitude?: number
  colorA?: string
  colorB?: string
}

export default function SilkRibbon({ 
  className = "", 
  speed = 1.2, 
  amplitude = 1.0, 
  colorA = "#6AA7FF", 
  colorB = "#A06BFF" 
}: SilkRibbonProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* More wavy, more visible, intersecting lines */}
      {Array.from({ length: 6 }).map((_, i) => {
        // Much closer together for intersection
        const startTop = 37 + i * 0.8; // Closer spacing for intersection
        const opacities = [0.7, 0.8, 0.6, 0.9, 0.65, 0.75]; // More visible
        const widths = [4, 5, 3.5, 4.5, 3, 5.5];
        const durations = [12, 15, 10, 18, 14, 16];
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: '120vw',
              height: `${widths[i]}px`,
              top: `${startTop}%`,
              left: '-10vw',
              background: `linear-gradient(90deg, transparent, rgba(106, 167, 255, ${opacities[i]}), transparent)`,
              borderRadius: '50px',
              filter: 'blur(0.3px)',
              boxShadow: `0 0 20px rgba(106, 167, 255, ${opacities[i] * 0.7})`,
            }}
            animate={{
              x: ['-10vw', '10vw'], // Continuous loop
              opacity: [opacities[i], opacities[i] * 1.3, opacities[i]],
              // Much more wavy - bigger amplitude
              scaleY: [1, 2.5, 0.3, 3, 0.4, 2.8, 1], // Much bigger wave motion
              // Add some horizontal wave motion too
              y: [0, -8, 12, -6, 10, -4, 0], // Vertical wave movement
            }}
            transition={{
              duration: durations[i],
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut', // More natural wave motion
              delay: i * 1.2, // Closer delays for intersection
            }}
          />
        );
      })}
    </div>
  )
}
