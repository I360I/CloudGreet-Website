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
      {/* 4 lines with much higher wave peaks */}
      {Array.from({ length: 4 }).map((_, i) => {
        const startTop = 37 + i * 1.2; // Slightly more spacing with fewer lines
        const opacities = [0.7, 0.8, 0.6, 0.9]; // 4 opacities
        const widths = [4, 5, 3.5, 4.5]; // 4 widths
        const durations = [12, 15, 10, 18]; // 4 durations
        
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
              // Much higher wave peaks - more dramatic bending
              scaleY: [1, 4, 0.2, 5, 0.3, 4.5, 0.4, 4.8, 1], // Much higher peaks
              // More dramatic vertical wave movement
              y: [0, -15, 20, -12, 18, -8, 15, -5, 0], // Higher wave movement
            }}
            transition={{
              duration: durations[i],
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: i * 1.5, // Slightly more spacing with fewer lines
            }}
          />
        );
      })}
    </div>
  )
}
