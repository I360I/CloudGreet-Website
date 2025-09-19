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
              width="200vw"
              height="80px"
              viewBox="0 0 2000 80"
              style={{
                top: `${startTop - 1}%`,
                left: '-50vw',
                filter: 'blur(0.2px)',
                overflow: 'visible',
              }}
              animate={{
                x: ['-50vw', '50vw'], // Much longer continuous loop
              }}
              transition={{
                duration: durations[i] * 2,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear',
                delay: i * 1.5,
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
              d={`M0,40 Q${frequencies[i]},20 ${frequencies[i]*2},40 T${frequencies[i]*4},40 T${frequencies[i]*6},40 T${frequencies[i]*8},40 T${frequencies[i]*10},40 T${frequencies[i]*12},40 T${frequencies[i]*14},40 T${frequencies[i]*16},40 T${frequencies[i]*18},40 T${frequencies[i]*20},40 T${frequencies[i]*22},40 T${frequencies[i]*24},40 T${frequencies[i]*26},40 T${frequencies[i]*28},40 T${frequencies[i]*30},40 T${frequencies[i]*32},40 T${frequencies[i]*34},40 T${frequencies[i]*36},40 T${frequencies[i]*38},40 T${frequencies[i]*40},40`}
              stroke={`rgba(106, 167, 255, ${opacities[i]})`}
              strokeWidth={strokeWidths[i]}
              fill="none"
              filter={`url(#glow-${i}) drop-shadow(0 0 12px rgba(106, 167, 255, ${opacities[i] * 0.8}))`}
              animate={{
                d: [
                  `M0,40 Q${frequencies[i]},20 ${frequencies[i]*2},40 T${frequencies[i]*4},40 T${frequencies[i]*6},40 T${frequencies[i]*8},40 T${frequencies[i]*10},40 T${frequencies[i]*12},40 T${frequencies[i]*14},40 T${frequencies[i]*16},40 T${frequencies[i]*18},40 T${frequencies[i]*20},40 T${frequencies[i]*22},40 T${frequencies[i]*24},40 T${frequencies[i]*26},40 T${frequencies[i]*28},40 T${frequencies[i]*30},40 T${frequencies[i]*32},40 T${frequencies[i]*34},40 T${frequencies[i]*36},40 T${frequencies[i]*38},40 T${frequencies[i]*40},40`,
                  `M0,40 Q${frequencies[i]},60 ${frequencies[i]*2},40 T${frequencies[i]*4},25 T${frequencies[i]*6},55 T${frequencies[i]*8},40 T${frequencies[i]*10},20 T${frequencies[i]*12},60 T${frequencies[i]*14},40 T${frequencies[i]*16},25 T${frequencies[i]*18},55 T${frequencies[i]*20},40 T${frequencies[i]*22},20 T${frequencies[i]*24},60 T${frequencies[i]*26},40 T${frequencies[i]*28},25 T${frequencies[i]*30},55 T${frequencies[i]*32},40 T${frequencies[i]*34},20 T${frequencies[i]*36},60 T${frequencies[i]*38},40 T${frequencies[i]*40},40`,
                  `M0,40 Q${frequencies[i]},25 ${frequencies[i]*2},55 T${frequencies[i]*4},40 T${frequencies[i]*6},20 T${frequencies[i]*8},40 T${frequencies[i]*10},60 T${frequencies[i]*12},25 T${frequencies[i]*14},40 T${frequencies[i]*16},55 T${frequencies[i]*18},20 T${frequencies[i]*20},40 T${frequencies[i]*22},60 T${frequencies[i]*24},25 T${frequencies[i]*26},40 T${frequencies[i]*28},55 T${frequencies[i]*30},20 T${frequencies[i]*32},40 T${frequencies[i]*34},60 T${frequencies[i]*36},25 T${frequencies[i]*38},40 T${frequencies[i]*40},40`,
                  `M0,40 Q${frequencies[i]},20 ${frequencies[i]*2},40 T${frequencies[i]*4},40 T${frequencies[i]*6},40 T${frequencies[i]*8},40 T${frequencies[i]*10},40 T${frequencies[i]*12},40 T${frequencies[i]*14},40 T${frequencies[i]*16},40 T${frequencies[i]*18},40 T${frequencies[i]*20},40 T${frequencies[i]*22},40 T${frequencies[i]*24},40 T${frequencies[i]*26},40 T${frequencies[i]*28},40 T${frequencies[i]*30},40 T${frequencies[i]*32},40 T${frequencies[i]*34},40 T${frequencies[i]*36},40 T${frequencies[i]*38},40 T${frequencies[i]*40},40`
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
