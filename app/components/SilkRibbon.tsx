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
              height="30px"
              viewBox="0 0 2000 30"
              style={{
                top: `${startTop}%`,
                left: '-50vw',
                filter: 'blur(0.2px)',
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
              d={`M0,15 Q${frequencies[i]},5 ${frequencies[i]*2},15 T${frequencies[i]*4},15 T${frequencies[i]*6},15 T${frequencies[i]*8},15 T${frequencies[i]*10},15 T${frequencies[i]*12},15 T${frequencies[i]*14},15 T${frequencies[i]*16},15 T${frequencies[i]*18},15 T${frequencies[i]*20},15 T${frequencies[i]*22},15 T${frequencies[i]*24},15 T${frequencies[i]*26},15 T${frequencies[i]*28},15 T${frequencies[i]*30},15 T${frequencies[i]*32},15 T${frequencies[i]*34},15 T${frequencies[i]*36},15 T${frequencies[i]*38},15 T${frequencies[i]*40},15`}
              stroke={`rgba(106, 167, 255, ${opacities[i]})`}
              strokeWidth={strokeWidths[i]}
              fill="none"
              filter={`url(#glow-${i}) drop-shadow(0 0 12px rgba(106, 167, 255, ${opacities[i] * 0.8}))`}
              animate={{
                d: [
                  `M0,15 Q${frequencies[i]},5 ${frequencies[i]*2},15 T${frequencies[i]*4},15 T${frequencies[i]*6},15 T${frequencies[i]*8},15 T${frequencies[i]*10},15 T${frequencies[i]*12},15 T${frequencies[i]*14},15 T${frequencies[i]*16},15 T${frequencies[i]*18},15 T${frequencies[i]*20},15 T${frequencies[i]*22},15 T${frequencies[i]*24},15 T${frequencies[i]*26},15 T${frequencies[i]*28},15 T${frequencies[i]*30},15 T${frequencies[i]*32},15 T${frequencies[i]*34},15 T${frequencies[i]*36},15 T${frequencies[i]*38},15 T${frequencies[i]*40},15`,
                  `M0,15 Q${frequencies[i]},25 ${frequencies[i]*2},15 T${frequencies[i]*4},8 T${frequencies[i]*6},22 T${frequencies[i]*8},15 T${frequencies[i]*10},5 T${frequencies[i]*12},25 T${frequencies[i]*14},15 T${frequencies[i]*16},8 T${frequencies[i]*18},22 T${frequencies[i]*20},15 T${frequencies[i]*22},5 T${frequencies[i]*24},25 T${frequencies[i]*26},15 T${frequencies[i]*28},8 T${frequencies[i]*30},22 T${frequencies[i]*32},15 T${frequencies[i]*34},5 T${frequencies[i]*36},25 T${frequencies[i]*38},15 T${frequencies[i]*40},15`,
                  `M0,15 Q${frequencies[i]},8 ${frequencies[i]*2},22 T${frequencies[i]*4},15 T${frequencies[i]*6},5 T${frequencies[i]*8},15 T${frequencies[i]*10},25 T${frequencies[i]*12},8 T${frequencies[i]*14},15 T${frequencies[i]*16},22 T${frequencies[i]*18},5 T${frequencies[i]*20},15 T${frequencies[i]*22},25 T${frequencies[i]*24},8 T${frequencies[i]*26},15 T${frequencies[i]*28},22 T${frequencies[i]*30},5 T${frequencies[i]*32},15 T${frequencies[i]*34},25 T${frequencies[i]*36},8 T${frequencies[i]*38},15 T${frequencies[i]*40},15`,
                  `M0,15 Q${frequencies[i]},5 ${frequencies[i]*2},15 T${frequencies[i]*4},15 T${frequencies[i]*6},15 T${frequencies[i]*8},15 T${frequencies[i]*10},15 T${frequencies[i]*12},15 T${frequencies[i]*14},15 T${frequencies[i]*16},15 T${frequencies[i]*18},15 T${frequencies[i]*20},15 T${frequencies[i]*22},15 T${frequencies[i]*24},15 T${frequencies[i]*26},15 T${frequencies[i]*28},15 T${frequencies[i]*30},15 T${frequencies[i]*32},15 T${frequencies[i]*34},15 T${frequencies[i]*36},15 T${frequencies[i]*38},15 T${frequencies[i]*40},15`
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
