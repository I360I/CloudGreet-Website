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
        // All start from same general area but moved up higher
        const startTop = 35 + i * 2; // Moved up higher (35-43%)
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
              transform: `rotate(0deg) scaleY(1)`, // Start straight
              transformOrigin: 'center',
            }}
            animate={{
              x: [0, 80, 40, 120, 20, 100, 0], // Gentle horizontal drift
              y: [0, -8, 6, -12, 4, -10, 0], // Small vertical wave movement
              rotate: [0, 2, -1, 3, -2, 1, 0], // Small rotation for wave effect
              opacity: [0.4, 0.8, 0.3, 0.9, 0.5, 0.7, 0.4], // More visible
              scaleY: [1, 1.5, 0.7, 1.8, 0.8, 1.3, 1], // Wave-like bending
              scaleX: [1, 1.2, 0.8, 1.4, 0.7, 1.1, 1], // Width variation for wave effect
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
        const startTop = 38 + i * 1.5; // Moved up higher (38-41%)
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
              transform: `rotate(0deg) scaleY(1)`, // Start straight
              transformOrigin: 'center',
            }}
            animate={{
              x: [0, 60, 30, 90, 15, 75, 0], // Gentle horizontal drift
              y: [0, -10, 8, -15, 5, -12, 0], // Small vertical wave movement
              rotate: [0, 3, -2, 4, -3, 2, 0], // Small rotation for wave effect
              opacity: [0.3, 0.9, 0.2, 0.95, 0.4, 0.8, 0.3], // More visible
              scaleY: [0.8, 2.0, 0.5, 2.2, 0.7, 1.8, 0.8], // More dramatic wave bending
              scaleX: [1, 1.4, 0.6, 1.6, 0.5, 1.3, 1], // Width variation for wave effect
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
