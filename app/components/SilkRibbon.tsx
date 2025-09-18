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
      {/* 5 intertwined strings floating like wind - behind Get Started button */}
      {Array.from({ length: 5 }).map((_, i) => {
        // Random positioning for each string to create intertwined effect
        const randomTop = 35 + Math.random() * 20; // Behind Get Started button (35-55%)
        const randomLeft = Math.random() * 30; // Random horizontal start
        const randomDelay = Math.random() * 3; // Random delay
        const randomDuration = 8 + Math.random() * 6; // Random duration
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              background: `linear-gradient(90deg, transparent, ${colorA}90, ${colorB}90, transparent)`,
              height: `${2 + Math.random() * 2}px`, // Random thickness
              width: '60%', // Shorter width for string-like appearance
              top: `${randomTop}%`,
              left: `${randomLeft}%`,
              filter: 'blur(0.3px)',
              borderRadius: '50px',
              transform: `rotate(${Math.random() * 10 - 5}deg)`, // Random rotation
            }}
            animate={{
              x: [0, 100, -50, 150, 0], // Irregular horizontal movement
              y: [0, -20, 10, -30, 5, -15, 0], // Floating wind-like vertical movement
              rotate: [Math.random() * 10 - 5, Math.random() * 15 - 7.5, Math.random() * 8 - 4, Math.random() * 12 - 6, Math.random() * 10 - 5],
              opacity: [0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.3],
              scaleY: [0.8, 1.5, 0.6, 1.8, 0.9, 1.3, 0.8],
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
      
      {/* Additional floating strings with different patterns */}
      {Array.from({ length: 3 }).map((_, i) => {
        const randomTop = 40 + Math.random() * 15; // Overlapping area
        const randomLeft = Math.random() * 40;
        const randomDelay = Math.random() * 4;
        const randomDuration = 10 + Math.random() * 8;
        
        return (
          <motion.div
            key={`string-${i}`}
            className="absolute"
            style={{
              background: `linear-gradient(90deg, transparent, ${colorB}70, ${colorA}70, transparent)`,
              height: `${1.5 + Math.random() * 1.5}px`,
              width: '45%',
              top: `${randomTop}%`,
              left: `${randomLeft}%`,
              filter: 'blur(0.2px)',
              borderRadius: '30px',
              transform: `rotate(${Math.random() * 15 - 7.5}deg)`,
            }}
            animate={{
              x: [0, 80, -30, 120, -20, 90, 0], // More irregular movement
              y: [0, -25, 15, -35, 8, -20, 0], // Stronger wind-like floating
              rotate: [Math.random() * 15 - 7.5, Math.random() * 20 - 10, Math.random() * 12 - 6, Math.random() * 18 - 9, Math.random() * 15 - 7.5],
              opacity: [0.2, 0.8, 0.1, 0.9, 0.3, 0.7, 0.2],
              scaleY: [0.5, 2.0, 0.4, 2.2, 0.7, 1.6, 0.5],
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
