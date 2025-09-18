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
      {/* 5 REAL wavy lines using SVG - behind Get Started button */}
      {Array.from({ length: 5 }).map((_, i) => {
        const startTop = 35 + i * 2; // Moved up higher (35-43%)
        const randomDelay = i * 0.5; // Staggered delays
        const randomDuration = 12 + i * 2; // Slightly different durations
        
        return (
          <motion.svg
            key={i}
            className="absolute"
            width="100%"
            height="20px"
            viewBox="0 0 1200 20"
            style={{
              top: `${startTop}%`,
              left: '0%',
              filter: 'blur(0.3px)',
            }}
            animate={{
              x: ['-100%', '100%'], // Flow across entire screen
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: randomDuration,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear',
              delay: randomDelay,
            }}
          >
            <motion.path
              d="M0,10 Q100,0 200,10 T400,10 T600,10 T800,10 T1000,10 T1200,10"
              stroke={`url(#gradient${i})`}
              strokeWidth="3"
              fill="none"
              animate={{
                d: [
                  "M0,10 Q100,0 200,10 T400,10 T600,10 T800,10 T1000,10 T1200,10",
                  "M0,10 Q100,20 200,10 T400,5 T600,15 T800,10 T1000,0 T1200,10",
                  "M0,10 Q100,5 200,15 T400,10 T600,0 T800,20 T1000,10 T1200,10",
                  "M0,10 Q100,0 200,10 T400,10 T600,10 T800,10 T1000,10 T1200,10"
                ]
              }}
              transition={{
                duration: randomDuration,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                delay: randomDelay,
              }}
            />
            <defs>
              <linearGradient id={`gradient${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="20%" stopColor={colorA} />
                <stop offset="50%" stopColor={colorB} />
                <stop offset="80%" stopColor={colorA} />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </motion.svg>
        );
      })}
      
      {/* Additional wavy lines with different wave patterns */}
      {Array.from({ length: 3 }).map((_, i) => {
        const startTop = 38 + i * 1.5; // Moved up higher (38-41%)
        const randomDelay = (i + 5) * 0.3;
        const randomDuration = 15 + i * 2;
        
        return (
          <motion.svg
            key={`wave-${i}`}
            className="absolute"
            width="100%"
            height="15px"
            viewBox="0 0 1200 15"
            style={{
              top: `${startTop}%`,
              left: '0%',
              filter: 'blur(0.2px)',
            }}
            animate={{
              x: ['-120%', '120%'], // Flow across entire screen
              opacity: [0.3, 0.9, 0.3],
            }}
            transition={{
              duration: randomDuration,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear',
              delay: randomDelay,
            }}
          >
            <motion.path
              d="M0,7.5 Q150,0 300,7.5 T600,7.5 T900,7.5 T1200,7.5"
              stroke={`url(#gradient2${i})`}
              strokeWidth="2.5"
              fill="none"
              animate={{
                d: [
                  "M0,7.5 Q150,0 300,7.5 T600,7.5 T900,7.5 T1200,7.5",
                  "M0,7.5 Q150,15 300,7.5 T600,2.5 T900,12.5 T1200,7.5",
                  "M0,7.5 Q150,5 300,10 T600,0 T900,15 T1200,7.5",
                  "M0,7.5 Q150,0 300,7.5 T600,7.5 T900,7.5 T1200,7.5"
                ]
              }}
              transition={{
                duration: randomDuration,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                delay: randomDelay,
              }}
            />
            <defs>
              <linearGradient id={`gradient2${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="25%" stopColor={colorB} />
                <stop offset="50%" stopColor={colorA} />
                <stop offset="75%" stopColor={colorB} />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </motion.svg>
        );
      })}
    </div>
  )
}
