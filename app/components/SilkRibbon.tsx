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
      {/* 5 wave lines grouped together, moving up and down like real waves */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorA}, ${colorB}, ${colorA}, transparent)`,
            height: `${3 + i * 0.5}px`,
            top: `${60 + i * 3}%`, // Grouped close together around trust badges
            filter: 'blur(0.5px)',
            borderRadius: '50px',
          }}
          animate={{
            x: ['-100%', '100%'],
            y: [0, -10, 0, 10, 0], // Wave-like up and down movement
            opacity: [0.2, 0.6, 0.2],
            scaleY: [0.8, 1.4, 0.8],
          }}
          transition={{
            duration: 12 + i * 1.5,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: i * 0.8,
          }}
        />
      ))}
      
      {/* Additional wave ribbons with more pronounced wave motion */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={`wave-${i}`}
          className="absolute w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorB}80, ${colorA}80, ${colorB}80, transparent)`,
            height: `${2 + i * 0.3}px`,
            top: `${58 + i * 6}%`, // Also grouped close together
            filter: 'blur(0.3px)',
            borderRadius: '30px',
          }}
          animate={{
            x: ['-120%', '120%'],
            y: [0, -15, 0, 15, 0], // More pronounced wave motion
            opacity: [0.15, 0.5, 0.15],
            scaleY: [0.6, 1.6, 0.6],
          }}
          transition={{
            duration: 18 + i * 2,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: i * 1.2,
          }}
        />
      ))}
    </div>
  )
}
