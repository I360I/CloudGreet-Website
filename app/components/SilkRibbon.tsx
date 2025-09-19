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
      {/* Ultra-smooth, ultra-long waves */}
      {Array.from({ length: 3 }).map((_, i) => {
        const startTop = 35 + i * 8;
        const opacities = [0.6, 0.8, 0.7];
        const strokeWidths = [3, 4, 3.5];
        const durations = [20, 25, 22];
        
        return (
          <motion.svg
            key={i}
            className="absolute"
            width="800vw"
            height="200px"
            viewBox="0 0 8000 200"
            style={{
              top: `${startTop}%`,
              left: '-300vw',
              filter: 'blur(0.5px)',
              overflow: 'visible',
            }}
          >
            <defs>
              <filter id={`glow-${i}`}>
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id={`gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colorA} stopOpacity={opacities[i]} />
                <stop offset="50%" stopColor={colorB} stopOpacity={opacities[i] * 0.8} />
                <stop offset="100%" stopColor={colorA} stopOpacity={opacities[i]} />
              </linearGradient>
            </defs>
            
            {/* Primary wave */}
            <motion.path
              d={`M0,100 C1000,50 2000,150 3000,100 C4000,50 5000,150 6000,100 C7000,50 8000,100`}
              stroke={`url(#gradient-${i})`}
              strokeWidth={strokeWidths[i]}
              fill="none"
              filter={`url(#glow-${i})`}
              animate={{
                d: [
                  `M0,100 C1000,50 2000,150 3000,100 C4000,50 5000,150 6000,100 C7000,50 8000,100`,
                  `M0,100 C1000,150 2000,50 3000,100 C4000,150 5000,50 6000,100 C7000,150 8000,100`,
                  `M0,100 C1000,80 2000,120 3000,100 C4000,80 5000,120 6000,100 C7000,80 8000,100`,
                  `M0,100 C1000,120 2000,80 3000,100 C4000,120 5000,80 6000,100 C7000,120 8000,100`,
                  `M0,100 C1000,50 2000,150 3000,100 C4000,50 5000,150 6000,100 C7000,50 8000,100`
                ]
              }}
              transition={{
                duration: durations[i],
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                delay: i * 2,
              }}
            />
            
            {/* Secondary subtle wave */}
            <motion.path
              d={`M0,110 C1000,70 2000,130 3000,110 C4000,70 5000,130 6000,110 C7000,70 8000,110`}
              stroke={`url(#gradient-${i})`}
              strokeWidth={strokeWidths[i] * 0.6}
              fill="none"
              filter={`url(#glow-${i})`}
              opacity={0.4}
              animate={{
                d: [
                  `M0,110 C1000,70 2000,130 3000,110 C4000,70 5000,130 6000,110 C7000,70 8000,110`,
                  `M0,110 C1000,130 2000,70 3000,110 C4000,130 5000,70 6000,110 C7000,130 8000,110`,
                  `M0,110 C1000,90 2000,130 3000,110 C4000,90 5000,130 6000,110 C7000,90 8000,110`,
                  `M0,110 C1000,130 2000,90 3000,110 C4000,130 5000,90 6000,110 C7000,130 8000,110`,
                  `M0,110 C1000,70 2000,130 3000,110 C4000,70 5000,130 6000,110 C7000,70 8000,110`
                ]
              }}
              transition={{
                duration: durations[i] * 1.2,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                delay: i * 2 + 1,
              }}
            />
          </motion.svg>
        );
      })}
    </div>
  )
}
