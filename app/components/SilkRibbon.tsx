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
      {/* Simple clean wavy lines */}
      {Array.from({ length: 5 }).map((_, i) => {
        const startTop = 35 + i * 2;
        const colors = ["#6AA7FF", "#A06BFF", "#4FACFE", "#B794F6", "#63B3ED"];
        const widths = [2, 3, 1.5, 2.5, 4];
        const durations = [15, 18, 12, 20, 16];
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: '100vw',
              height: `${widths[i]}px`,
              top: `${startTop}%`,
              left: '0',
              background: `linear-gradient(90deg, transparent, ${colors[i]}, transparent)`,
              borderRadius: '50px',
              filter: 'blur(0.5px)',
              boxShadow: `0 0 10px ${colors[i]}40`,
            }}
            animate={{
              x: ['-100vw', '100vw'],
              opacity: [0.6, 0.9, 0.6],
              scaleY: [1, 1.5, 0.8, 1.2, 1],
            }}
            transition={{
              duration: durations[i],
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear',
              delay: i * 2,
            }}
          />
        );
      })}
    </div>
  )
}
