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
              transform: `rotate(${i * 3 - 6}deg)`, // Slight rotation variation
            }}
            animate={{
              x: [0, 150, -80, 200, -60, 180, 0], // Much more horizontal movement
              y: [0, -5, 3, -8, 2, -6, 0], // Minimal vertical movement
              rotate: [i * 3 - 6, i * 5 - 10, i * 2 - 4, i * 6 - 12, i * 4 - 8, i * 3 - 6],
              opacity: [0.4, 0.8, 0.3, 0.9, 0.5, 0.7, 0.4], // More visible
              scaleY: [0.8, 1.6, 0.6, 2.0, 0.9, 1.4, 0.8],
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
              transform: `rotate(${i * 4 - 6}deg)`,
            }}
            animate={{
              x: [0, 180, -90, 220, -70, 200, 0], // Much more horizontal movement
              y: [0, -3, 2, -5, 1, -4, 0], // Minimal vertical movement
              rotate: [i * 4 - 6, i * 6 - 9, i * 3 - 4.5, i * 7 - 10.5, i * 5 - 7.5, i * 4 - 6],
              opacity: [0.3, 0.9, 0.2, 0.95, 0.4, 0.8, 0.3], // More visible
              scaleY: [0.6, 2.2, 0.5, 2.5, 0.8, 1.8, 0.6],
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
