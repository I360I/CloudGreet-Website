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
      {/* 5 wavy lines like a treadmill - behind Get Started button */}
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
              width: '70%',
              height: `${4 + i * 0.5}px`, // Slightly different thickness
              top: `${startTop}%`,
              left: `${startLeft}%`,
              filter: 'blur(0.2px)',
              background: `linear-gradient(90deg, transparent, ${colorA}, ${colorB}, ${colorA}, transparent)`,
              clipPath: `polygon(0% 50%, 10% 40%, 20% 60%, 30% 35%, 40% 65%, 50% 30%, 60% 70%, 70% 25%, 80% 75%, 90% 40%, 100% 50%)`, // Wavy shape
            }}
            animate={{
              x: [0, 100, 0], // Treadmill-like horizontal movement
              opacity: [0.4, 0.8, 0.4], // Pulsing visibility
            }}
            transition={{
              duration: randomDuration,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear', // Smooth linear movement like treadmill
              delay: randomDelay,
            }}
          />
        );
      })}
      
      {/* Additional wavy lines with different wave patterns */}
      {Array.from({ length: 3 }).map((_, i) => {
        const startTop = 38 + i * 1.5; // Moved up higher (38-41%)
        const startLeft = 8 + i * 1.5; // Start closer to left side (8-12%)
        const randomDelay = (i + 5) * 0.3;
        const randomDuration = 15 + i * 2;
        
        // Different wave patterns for variety
        const wavePatterns = [
          `polygon(0% 50%, 15% 35%, 25% 65%, 35% 25%, 45% 75%, 55% 30%, 65% 70%, 75% 40%, 85% 60%, 100% 50%)`,
          `polygon(0% 50%, 12% 60%, 22% 30%, 32% 80%, 42% 20%, 52% 90%, 62% 15%, 72% 85%, 82% 35%, 100% 50%)`,
          `polygon(0% 50%, 8% 25%, 18% 75%, 28% 40%, 38% 60%, 48% 35%, 58% 65%, 68% 45%, 78% 55%, 100% 50%)`
        ];
        
        return (
          <motion.div
            key={`wave-${i}`}
            className="absolute"
            style={{
              width: '55%',
              height: `${3 + i * 0.3}px`,
              top: `${startTop}%`,
              left: `${startLeft}%`,
              filter: 'blur(0.1px)',
              background: `linear-gradient(90deg, transparent, ${colorB}90, ${colorA}90, transparent)`,
              clipPath: wavePatterns[i], // Different wave pattern for each line
            }}
            animate={{
              x: [0, 80, 0], // Treadmill-like horizontal movement
              opacity: [0.3, 0.9, 0.3], // Pulsing visibility
            }}
            transition={{
              duration: randomDuration,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear', // Smooth linear movement like treadmill
              delay: randomDelay,
            }}
          />
        );
      })}
    </div>
  )
}
