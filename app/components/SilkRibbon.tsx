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
      {/* Flowing wave lines - exactly 5 lines like you described */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorA}, ${colorB}, ${colorA}, transparent)`,
            height: `${4 + i * 1}px`,
            top: `${50 + i * 10}%`, // More spread out positioning
            filter: 'blur(0.5px)',
            borderRadius: '50px',
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0.2, 0.6, 0.2],
            scaleY: [0.8, 1.4, 0.8],
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: i * 1.5,
          }}
        />
      ))}
      
      {/* Additional flowing ribbons for more wave effect */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={`wave-${i}`}
          className="absolute w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorB}80, ${colorA}80, ${colorB}80, transparent)`,
            height: `${3 + i * 0.5}px`,
            top: `${45 + i * 18}%`,
            filter: 'blur(0.3px)',
            borderRadius: '30px',
          }}
          animate={{
            x: ['-120%', '120%'],
            opacity: [0.15, 0.5, 0.15],
            scaleY: [0.6, 1.6, 0.6],
          }}
          transition={{
            duration: 20 + i * 3,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: i * 2 + 0.5,
          }}
        />
      ))}
    </div>
  )
}
