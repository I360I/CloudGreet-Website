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
              clipPath: `polygon(0% 50%, 8% 20%, 16% 80%, 24% 15%, 32% 85%, 40% 25%, 48% 75%, 56% 10%, 64% 90%, 72% 35%, 80% 65%, 88% 45%, 96% 55%, 100% 50%)`, // More dramatic wavy shape
            }}
            animate={{
              x: ['-100%', '100%'], // Flow from left side to right side
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
        
        // Different wave patterns for variety - more dramatic waves
        const wavePatterns = [
          `polygon(0% 50%, 6% 10%, 12% 90%, 18% 5%, 24% 95%, 30% 20%, 36% 80%, 42% 15%, 48% 85%, 54% 30%, 60% 70%, 66% 25%, 72% 75%, 78% 40%, 84% 60%, 90% 35%, 96% 65%, 100% 50%)`,
          `polygon(0% 50%, 7% 80%, 14% 20%, 21% 85%, 28% 15%, 35% 90%, 42% 10%, 49% 95%, 56% 25%, 63% 75%, 70% 30%, 77% 70%, 84% 35%, 91% 65%, 100% 50%)`,
          `polygon(0% 50%, 5% 25%, 10% 75%, 15% 15%, 20% 85%, 25% 35%, 30% 65%, 35% 20%, 40% 80%, 45% 40%, 50% 60%, 55% 30%, 60% 70%, 65% 25%, 70% 75%, 75% 45%, 80% 55%, 85% 35%, 90% 65%, 95% 40%, 100% 50%)`
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
              x: ['-120%', '120%'], // Flow from left side to right side
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
