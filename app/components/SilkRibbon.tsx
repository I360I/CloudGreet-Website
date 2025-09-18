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
  // Different colors, widths, and frequencies for each line
  const lineConfigs = [
    { color: "#6AA7FF", width: 2, glow: "#6AA7FF40", freq: 80 }, // Blue, thin, low freq
    { color: "#A06BFF", width: 3, glow: "#A06BFF40", freq: 120 }, // Purple, medium, medium freq
    { color: "#4FACFE", width: 1.5, glow: "#4FACFE40", freq: 160 }, // Light blue, thin, high freq
    { color: "#B794F6", width: 2.5, glow: "#B794F640", freq: 100 }, // Light purple, medium, medium-low freq
    { color: "#63B3ED", width: 4, glow: "#63B3ED40", freq: 140 }, // Blue, thick, high freq
    { color: "#C084FC", width: 1.8, glow: "#C084FC40", freq: 180 }, // Purple, thin, very high freq
    { color: "#5A9FD4", width: 3.2, glow: "#5A9FD440", freq: 90 }, // Dark blue, thick, low freq
    { color: "#A78BFA", width: 2.2, glow: "#A78BFA40", freq: 150 }, // Purple, medium, high freq
  ];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* 8 wavy lines with different properties */}
      {Array.from({ length: 8 }).map((_, i) => {
        const config = lineConfigs[i];
        const startTop = 35 + i * 1.5; // Spread them out more
        const duration = 8 + i * 1.5; // Different speeds
        
        return (
          <motion.svg
            key={i}
            className="absolute"
            width="200%" // Wider to prevent gaps
            height="25px"
            viewBox="0 0 2400 25"
            style={{
              top: `${startTop}%`,
              left: '-50%', // Start further left to prevent gaps
              filter: `blur(0.5px) drop-shadow(0 0 3px ${config.glow})`,
            }}
            animate={{
              x: ['-50%', '50%'], // Continuous movement across screen
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'linear',
              delay: i * 0.8, // Staggered delays
            }}
          >
            <motion.path
              d={`M0,12.5 Q${config.freq/2},5 ${config.freq},12.5 T${config.freq*2},12.5 T${config.freq*3},12.5 T${config.freq*4},12.5 T${config.freq*5},12.5 T${config.freq*6},12.5`}
              stroke={config.color}
              strokeWidth={config.width}
              fill="none"
              animate={{
                d: [
                  `M0,12.5 Q${config.freq/2},5 ${config.freq},12.5 T${config.freq*2},12.5 T${config.freq*3},12.5 T${config.freq*4},12.5 T${config.freq*5},12.5 T${config.freq*6},12.5`,
                  `M0,12.5 Q${config.freq/2},20 ${config.freq},12.5 T${config.freq*2},8 T${config.freq*3},17 T${config.freq*4},12.5 T${config.freq*5},6 T${config.freq*6},12.5`,
                  `M0,12.5 Q${config.freq/2},8 ${config.freq},15 T${config.freq*2},12.5 T${config.freq*3},4 T${config.freq*4},21 T${config.freq*5},12.5 T${config.freq*6},12.5`,
                  `M0,12.5 Q${config.freq/2},5 ${config.freq},12.5 T${config.freq*2},12.5 T${config.freq*3},12.5 T${config.freq*4},12.5 T${config.freq*5},12.5 T${config.freq*6},12.5`
                ]
              }}
              transition={{
                duration: duration * 1.5,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                delay: i * 0.8,
              }}
            />
            {/* Glow effect */}
            <motion.path
              d={`M0,12.5 Q${config.freq/2},5 ${config.freq},12.5 T${config.freq*2},12.5 T${config.freq*3},12.5 T${config.freq*4},12.5 T${config.freq*5},12.5 T${config.freq*6},12.5`}
              stroke={config.glow}
              strokeWidth={config.width * 3}
              fill="none"
              opacity={0.3}
              animate={{
                d: [
                  `M0,12.5 Q${config.freq/2},5 ${config.freq},12.5 T${config.freq*2},12.5 T${config.freq*3},12.5 T${config.freq*4},12.5 T${config.freq*5},12.5 T${config.freq*6},12.5`,
                  `M0,12.5 Q${config.freq/2},20 ${config.freq},12.5 T${config.freq*2},8 T${config.freq*3},17 T${config.freq*4},12.5 T${config.freq*5},6 T${config.freq*6},12.5`,
                  `M0,12.5 Q${config.freq/2},8 ${config.freq},15 T${config.freq*2},12.5 T${config.freq*3},4 T${config.freq*4},21 T${config.freq*5},12.5 T${config.freq*6},12.5`,
                  `M0,12.5 Q${config.freq/2},5 ${config.freq},12.5 T${config.freq*2},12.5 T${config.freq*3},12.5 T${config.freq*4},12.5 T${config.freq*5},12.5 T${config.freq*6},12.5`
                ]
              }}
              transition={{
                duration: duration * 1.5,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                delay: i * 0.8,
              }}
            />
          </motion.svg>
        );
      })}
    </div>
  )
}
