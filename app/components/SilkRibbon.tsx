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
      {/* 5 intertwined strings starting from same spot - behind Get Started button */}
      {Array.from({ length: 5 }).map((_, i) => {
        // All start from same general area but anchored closer to sides
        const startTop = 45 + i * 2; // Start near same spot (45-53%)
        const startLeft = 5 + i * 2; // Start closer to left side (5-13%)
        const randomDelay = i * 0.5; // Staggered delays
        const randomDuration = 12 + i * 2; // Slightly different durations
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              background: `linear-gradient(90deg, transparent, ${colorA}, ${colorB}, ${colorA}, transparent)`,
              height: `${3 + i * 0.5}px`, // Slightly different thickness
              width: '70%', // Longer for better visibility
              top: `${startTop}%`,
              left: `${startLeft}%`,
              filter: 'blur(0.2px)',
              borderRadius: '50px',
              transform: `rotate(0deg)`, // No initial rotation
            }}
            animate={{
              x: [0, 100, 50, 150, 25, 120, 0], // Gentle horizontal drift
              y: [0, 0, 0, 0, 0, 0, 0], // No vertical movement - stays anchored
              rotate: [0, 0, 0, 0, 0, 0, 0], // No rotation - keeps straight
              opacity: [0.4, 0.8, 0.3, 0.9, 0.5, 0.7, 0.4], // More visible
              scaleY: [1, 1.8, 0.6, 2.2, 0.8, 1.6, 1], // Wave-like bending
              scaleX: [1, 1.1, 0.9, 1.2, 0.8, 1.1, 1], // Width variation for wave effect
              transformOrigin: 'center', // Bend from center like a wave
            }}
            transition={{
              duration: randomDuration,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: randomDelay,
            }}
          />
        );
      })}
      
      {/* Additional floating strings starting from same area */}
      {Array.from({ length: 3 }).map((_, i) => {
        const startTop = 48 + i * 1.5; // Start near same area
        const startLeft = 8 + i * 1.5; // Start closer to left side (8-12%)
        const randomDelay = (i + 5) * 0.3;
        const randomDuration = 15 + i * 2;
        
        return (
          <motion.div
            key={`string-${i}`}
            className="absolute"
            style={{
              background: `linear-gradient(90deg, transparent, ${colorB}90, ${colorA}90, transparent)`,
              height: `${2.5 + i * 0.3}px`,
              width: '55%',
              top: `${startTop}%`,
              left: `${startLeft}%`,
              filter: 'blur(0.1px)',
              borderRadius: '30px',
              transform: `rotate(0deg)`, // No initial rotation
            }}
            animate={{
              x: [0, 80, 40, 120, 20, 100, 0], // Gentle horizontal drift
              y: [0, 0, 0, 0, 0, 0, 0], // No vertical movement - stays anchored
              rotate: [0, 0, 0, 0, 0, 0, 0], // No rotation - keeps straight
              opacity: [0.3, 0.9, 0.2, 0.95, 0.4, 0.8, 0.3], // More visible
              scaleY: [0.8, 2.4, 0.4, 2.8, 0.6, 2.0, 0.8], // More dramatic wave bending
              scaleX: [1, 1.3, 0.7, 1.4, 0.6, 1.2, 1], // Width variation for wave effect
              transformOrigin: 'center', // Bend from center like a wave
            }}
            transition={{
              duration: randomDuration,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: randomDelay,
            }}
          />
        );
      })}
    </div>
  )
}
