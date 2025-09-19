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
      {/* Simple wavy lines with continuous loop - no lag */}
      {Array.from({ length: 5 }).map((_, i) => {
        const startTop = 37 + i * 1.5;
        const opacities = [0.4, 0.6, 0.3, 0.5, 0.35];
        const widths = [3, 4, 2.5, 3.5, 2];
        const durations = [12, 15, 10, 18, 14];
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: '120vw', // Wider for seamless loop
              height: `${widths[i]}px`,
              top: `${startTop}%`,
              left: '-10vw', // Start slightly left for seamless loop
              background: `linear-gradient(90deg, transparent, rgba(106, 167, 255, ${opacities[i]}), transparent)`,
              borderRadius: '50px',
              filter: 'blur(0.5px)',
              boxShadow: `0 0 15px rgba(106, 167, 255, ${opacities[i] * 0.5})`,
            }}
            animate={{
              x: ['-10vw', '10vw'], // Simple continuous loop
              opacity: [opacities[i], opacities[i] * 1.2, opacities[i]],
              // Simple wave-like scaling - no complex rotations
              scaleY: [1, 1.8, 0.6, 2, 1], // Wave height changes
            }}
            transition={{
              duration: durations[i],
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear', // Smooth linear movement
              delay: i * 2,
            }}
          />
        );
      })}
    </div>
  )
}
