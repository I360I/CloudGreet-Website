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
              width="300vw"
              height="80px"
              viewBox="0 0 3000 80"
              style={{
                top: `${startTop - 1}%`,
                left: '-100vw',
                filter: 'blur(0.2px)',
                overflow: 'visible',
              }}
              animate={{
                x: ['-100vw', '100vw'], // Seamless infinite loop
              }}
              transition={{
                duration: durations[i] * 3,
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
              d={`M0,40 Q${frequencies[i]},20 ${frequencies[i]*2},40 T${frequencies[i]*4},40 T${frequencies[i]*6},40 T${frequencies[i]*8},40 T${frequencies[i]*10},40 T${frequencies[i]*12},40 T${frequencies[i]*14},40 T${frequencies[i]*16},40 T${frequencies[i]*18},40 T${frequencies[i]*20},40 T${frequencies[i]*22},40 T${frequencies[i]*24},40 T${frequencies[i]*26},40 T${frequencies[i]*28},40 T${frequencies[i]*30},40 T${frequencies[i]*32},40 T${frequencies[i]*34},40 T${frequencies[i]*36},40 T${frequencies[i]*38},40 T${frequencies[i]*40},40 T${frequencies[i]*42},40 T${frequencies[i]*44},40 T${frequencies[i]*46},40 T${frequencies[i]*48},40 T${frequencies[i]*50},40 T${frequencies[i]*52},40 T${frequencies[i]*54},40 T${frequencies[i]*56},40 T${frequencies[i]*58},40 T${frequencies[i]*60},40 T${frequencies[i]*62},40 T${frequencies[i]*64},40 T${frequencies[i]*66},40 T${frequencies[i]*68},40 T${frequencies[i]*70},40 T${frequencies[i]*72},40 T${frequencies[i]*74},40 T${frequencies[i]*76},40 T${frequencies[i]*78},40 T${frequencies[i]*80},40`}
              stroke={`rgba(106, 167, 255, ${opacities[i]})`}
              strokeWidth={strokeWidths[i]}
              fill="none"
              filter={`url(#glow-${i}) drop-shadow(0 0 12px rgba(106, 167, 255, ${opacities[i] * 0.8}))`}
              animate={{
                d: [
                  `M0,40 Q${frequencies[i]},20 ${frequencies[i]*2},40 T${frequencies[i]*4},40 T${frequencies[i]*6},40 T${frequencies[i]*8},40 T${frequencies[i]*10},40 T${frequencies[i]*12},40 T${frequencies[i]*14},40 T${frequencies[i]*16},40 T${frequencies[i]*18},40 T${frequencies[i]*20},40 T${frequencies[i]*22},40 T${frequencies[i]*24},40 T${frequencies[i]*26},40 T${frequencies[i]*28},40 T${frequencies[i]*30},40 T${frequencies[i]*32},40 T${frequencies[i]*34},40 T${frequencies[i]*36},40 T${frequencies[i]*38},40 T${frequencies[i]*40},40 T${frequencies[i]*42},40 T${frequencies[i]*44},40 T${frequencies[i]*46},40 T${frequencies[i]*48},40 T${frequencies[i]*50},40 T${frequencies[i]*52},40 T${frequencies[i]*54},40 T${frequencies[i]*56},40 T${frequencies[i]*58},40 T${frequencies[i]*60},40 T${frequencies[i]*62},40 T${frequencies[i]*64},40 T${frequencies[i]*66},40 T${frequencies[i]*68},40 T${frequencies[i]*70},40 T${frequencies[i]*72},40 T${frequencies[i]*74},40 T${frequencies[i]*76},40 T${frequencies[i]*78},40 T${frequencies[i]*80},40`,
                  `M0,40 Q${frequencies[i]},60 ${frequencies[i]*2},40 T${frequencies[i]*4},25 T${frequencies[i]*6},55 T${frequencies[i]*8},40 T${frequencies[i]*10},20 T${frequencies[i]*12},60 T${frequencies[i]*14},40 T${frequencies[i]*16},25 T${frequencies[i]*18},55 T${frequencies[i]*20},40 T${frequencies[i]*22},20 T${frequencies[i]*24},60 T${frequencies[i]*26},40 T${frequencies[i]*28},25 T${frequencies[i]*30},55 T${frequencies[i]*32},40 T${frequencies[i]*34},20 T${frequencies[i]*36},60 T${frequencies[i]*38},40 T${frequencies[i]*40},40 T${frequencies[i]*42},25 T${frequencies[i]*44},55 T${frequencies[i]*46},40 T${frequencies[i]*48},20 T${frequencies[i]*50},60 T${frequencies[i]*52},40 T${frequencies[i]*54},25 T${frequencies[i]*56},55 T${frequencies[i]*58},40 T${frequencies[i]*60},20 T${frequencies[i]*62},60 T${frequencies[i]*64},40 T${frequencies[i]*66},25 T${frequencies[i]*68},55 T${frequencies[i]*70},40 T${frequencies[i]*72},20 T${frequencies[i]*74},60 T${frequencies[i]*76},40 T${frequencies[i]*78},40 T${frequencies[i]*80},40`,
                  `M0,40 Q${frequencies[i]},25 ${frequencies[i]*2},55 T${frequencies[i]*4},40 T${frequencies[i]*6},20 T${frequencies[i]*8},40 T${frequencies[i]*10},60 T${frequencies[i]*12},25 T${frequencies[i]*14},40 T${frequencies[i]*16},55 T${frequencies[i]*18},20 T${frequencies[i]*20},40 T${frequencies[i]*22},60 T${frequencies[i]*24},25 T${frequencies[i]*26},40 T${frequencies[i]*28},55 T${frequencies[i]*30},20 T${frequencies[i]*32},40 T${frequencies[i]*34},60 T${frequencies[i]*36},25 T${frequencies[i]*38},40 T${frequencies[i]*40},40 T${frequencies[i]*42},20 T${frequencies[i]*44},40 T${frequencies[i]*46},60 T${frequencies[i]*48},25 T${frequencies[i]*50},40 T${frequencies[i]*52},55 T${frequencies[i]*54},20 T${frequencies[i]*56},40 T${frequencies[i]*58},60 T${frequencies[i]*60},25 T${frequencies[i]*62},40 T${frequencies[i]*64},55 T${frequencies[i]*66},20 T${frequencies[i]*68},40 T${frequencies[i]*70},60 T${frequencies[i]*72},25 T${frequencies[i]*74},40 T${frequencies[i]*76},55 T${frequencies[i]*78},40 T${frequencies[i]*80},40`,
                  `M0,40 Q${frequencies[i]},20 ${frequencies[i]*2},40 T${frequencies[i]*4},40 T${frequencies[i]*6},40 T${frequencies[i]*8},40 T${frequencies[i]*10},40 T${frequencies[i]*12},40 T${frequencies[i]*14},40 T${frequencies[i]*16},40 T${frequencies[i]*18},40 T${frequencies[i]*20},40 T${frequencies[i]*22},40 T${frequencies[i]*24},40 T${frequencies[i]*26},40 T${frequencies[i]*28},40 T${frequencies[i]*30},40 T${frequencies[i]*32},40 T${frequencies[i]*34},40 T${frequencies[i]*36},40 T${frequencies[i]*38},40 T${frequencies[i]*40},40 T${frequencies[i]*42},40 T${frequencies[i]*44},40 T${frequencies[i]*46},40 T${frequencies[i]*48},40 T${frequencies[i]*50},40 T${frequencies[i]*52},40 T${frequencies[i]*54},40 T${frequencies[i]*56},40 T${frequencies[i]*58},40 T${frequencies[i]*60},40 T${frequencies[i]*62},40 T${frequencies[i]*64},40 T${frequencies[i]*66},40 T${frequencies[i]*68},40 T${frequencies[i]*70},40 T${frequencies[i]*72},40 T${frequencies[i]*74},40 T${frequencies[i]*76},40 T${frequencies[i]*78},40 T${frequencies[i]*80},40`
                ],
                strokeWidth: [strokeWidths[i], strokeWidths[i] * 1.5, strokeWidths[i]],
                filter: [
                  `url(#glow-${i}) drop-shadow(0 0 12px rgba(106, 167, 255, ${opacities[i] * 0.8}))`,
                  `url(#glow-${i}) drop-shadow(0 0 20px rgba(106, 167, 255, ${opacities[i] * 1.2}))`,
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
