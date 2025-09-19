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
      {/* Overlapping 3D wavy lines - always across screen */}
      {Array.from({ length: 8 }).map((_, i) => {
        // Overlap lines more - closer positioning
        const startTop = 35 + i * 1.2; // Closer together for overlap
        const colors = ["#6AA7FF", "#A06BFF", "#4FACFE", "#B794F6", "#63B3ED", "#8B5CF6", "#3B82F6", "#A855F7"];
        const widths = [3, 4, 2, 3.5, 5, 2.5, 4.5, 3.2];
        const durations = [12, 15, 10, 18, 14, 16, 13, 17];
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: '150vw', // Wider to ensure no gaps
              height: `${widths[i]}px`,
              top: `${startTop}%`,
              left: '-25vw', // Start further left
              background: `linear-gradient(90deg, transparent, ${colors[i]}, transparent)`,
              borderRadius: '50px',
              filter: 'blur(0.3px)',
              boxShadow: `0 0 15px ${colors[i]}60, 0 0 30px ${colors[i]}30`, // Stronger 3D glow
              zIndex: 10 - i, // Layering for 3D effect
            }}
            animate={{
              x: ['-50vw', '50vw'], // Continuous movement with overlap
              opacity: [0.7, 0.95, 0.7],
              scaleY: [1, 1.8, 0.6, 2.2, 1], // More dramatic wave motion
              scaleX: [1, 1.1, 0.9, 1.2, 1], // Width variation for 3D
            }}
            transition={{
              duration: durations[i],
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear',
              delay: i * 0.8, // Closer delays for overlap
            }}
          />
        );
      })}
    </div>
  )
}
