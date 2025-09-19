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
      {/* Clean thin wavy lines */}
      {Array.from({ length: 4 }).map((_, i) => {
        const startTop = 37 + i * 1.5; // More spacing
        const opacities = [0.6, 0.7, 0.5, 0.8]; // Slightly more visible
        const baseWidths = [1.8, 2.2, 1.5, 2.8]; // Slightly thicker for better visibility
        const durations = [12, 15, 10, 18];
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: '120vw',
              height: `${baseWidths[i]}px`, // Much thinner
              top: `${startTop}%`,
              left: '-10vw',
              background: `linear-gradient(90deg, transparent, rgba(106, 167, 255, ${opacities[i]}), transparent)`,
              borderRadius: '50px',
              filter: 'blur(0.1px)',
              boxShadow: `0 0 15px rgba(106, 167, 255, ${opacities[i] * 0.5})`,
            }}
            animate={{
              x: ['-10vw', '10vw'], // Continuous loop
              // No opacity changes - keep consistent
              // Moderate wave peaks - not too thick
              scaleY: [1, 2, 0.5, 2.2, 0.6, 2.1, 1], // Moderate peaks
              // Subtle vertical wave movement
              y: [0, -8, 10, -6, 8, -4, 0], // Moderate wave movement
            }}
            transition={{
              duration: durations[i],
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: i * 1.5,
            }}
          />
        );
      })}
    </div>
  )
}
