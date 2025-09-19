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
      {/* Actually wavy lines using SVG */}
      {Array.from({ length: 4 }).map((_, i) => {
        const startTop = 37 + i * 1.5;
        const opacities = [0.6, 0.7, 0.5, 0.8];
        const strokeWidths = [2, 2.5, 1.8, 3];
        const durations = [12, 15, 10, 18];
        const frequencies = [60, 80, 50, 70]; // Different wave frequencies
        
        return (
            <motion.svg
              key={i}
              className="absolute"
              width="100vw"
              height="80px"
              viewBox="0 0 1000 80"
              style={{
                top: `${startTop - 1}%`,
                left: '0vw',
                filter: 'blur(0.2px)',
                overflow: 'visible',
              }}
            >
            <defs>
              <filter id={`glow-${i}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <motion.path
              d={`M0,40 Q250,20 500,40 T1000,40`}
              stroke={`rgba(106, 167, 255, ${opacities[i]})`}
              strokeWidth={strokeWidths[i]}
              fill="none"
              filter={`url(#glow-${i}) drop-shadow(0 0 12px rgba(106, 167, 255, ${opacities[i] * 0.8}))`}
              animate={{
                d: [
                  `M0,40 Q250,20 500,40 T1000,40`,
                  `M0,40 Q250,60 500,40 T1000,40`,
                  `M0,40 Q250,25 500,55 T1000,40`,
                  `M0,40 Q250,35 500,45 T1000,40`,
                  `M0,40 Q250,20 500,40 T1000,40`
                ],
                strokeWidth: [strokeWidths[i], strokeWidths[i] * 1.3, strokeWidths[i]],
                filter: [
                  `url(#glow-${i}) drop-shadow(0 0 12px rgba(106, 167, 255, ${opacities[i] * 0.8}))`,
                  `url(#glow-${i}) drop-shadow(0 0 18px rgba(106, 167, 255, ${opacities[i] * 1.1}))`,
                  `url(#glow-${i}) drop-shadow(0 0 15px rgba(106, 167, 255, ${opacities[i] * 0.9}))`,
                  `url(#glow-${i}) drop-shadow(0 0 12px rgba(106, 167, 255, ${opacities[i] * 0.8}))`
                ]
              }}
              transition={{
                duration: durations[i] * 1.5,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                delay: i * 1.5,
              }}
            />
          </motion.svg>
        );
      })}
    </div>
  )
}
