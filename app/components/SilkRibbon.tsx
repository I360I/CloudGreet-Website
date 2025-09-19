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
        const opacities = [0.8, 0.9, 0.7, 1.0];
        const strokeWidths = [4, 4.5, 3.8, 5];
        const durations = [12, 15, 10, 18];
        const frequencies = [60, 80, 50, 70]; // Different wave frequencies
        
        return (
            <motion.svg
              key={i}
              className="absolute"
              width="400vw"
              height="120px"
              viewBox="0 0 4000 120"
              style={{
                top: `${startTop - 1}%`,
                left: '-150vw',
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
              d={`M0,60 Q1000,30 2000,60 Q3000,90 4000,60`}
              stroke={`rgba(106, 167, 255, ${opacities[i]})`}
              strokeWidth={strokeWidths[i]}
              fill="none"
              filter={`url(#glow-${i}) drop-shadow(0 0 12px rgba(106, 167, 255, ${opacities[i] * 0.8}))`}
              animate={{
                d: [
                  `M0,60 Q1000,30 2000,60 Q3000,90 4000,60`,
                  `M0,60 Q1000,90 2000,60 Q3000,30 4000,65`,
                  `M0,60 Q1000,35 2000,85 Q3000,55 4000,55`,
                  `M0,60 Q1000,55 2000,75 Q3000,35 4000,62`,
                  `M0,60 Q1000,30 2000,60 Q3000,90 4000,58`,
                  `M0,60 Q1000,75 2000,60 Q3000,45 4000,60`
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
