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
          className="absolute w-full opacity-25"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorA}60, ${colorB}80, ${colorA}60, transparent)`,
            height: `${3 + i * 0.5}px`,
            top: `${60 + i * 8}%`, // Positioned around the trust badges area
            filter: 'blur(1px)',
            borderRadius: '50px',
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0.1, 0.4, 0.1],
            scaleY: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: 12 + i * 2,
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
          className="absolute w-full opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorB}40, ${colorA}60, ${colorB}40, transparent)`,
            height: `${2 + i * 0.3}px`,
            top: `${55 + i * 15}%`,
            filter: 'blur(0.8px)',
            borderRadius: '30px',
          }}
          animate={{
            x: ['-120%', '120%'],
            opacity: [0.05, 0.3, 0.05],
            scaleY: [0.6, 1.5, 0.6],
          }}
          transition={{
            duration: 18 + i * 3,
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
