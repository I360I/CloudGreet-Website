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
      {/* Animated background lines */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full h-px opacity-20"
          style={{
            background: `linear-gradient(90deg, ${colorA}, ${colorB}, ${colorA})`,
            top: `${10 + i * 12}%`,
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 8 + i * 0.5,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
            delay: i * 0.5,
          }}
        />
      ))}
      
      {/* Vertical flowing lines */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={`vertical-${i}`}
          className="absolute w-px h-full opacity-15"
          style={{
            background: `linear-gradient(180deg, ${colorA}, ${colorB}, ${colorA})`,
            left: `${15 + i * 20}%`,
          }}
          animate={{
            y: ['-100%', '100%'],
            opacity: [0.05, 0.25, 0.05],
          }}
          transition={{
            duration: 12 + i * 0.8,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
            delay: i * 1.2,
          }}
        />
      ))}
      
      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full opacity-30"
          style={{
            background: Math.random() > 0.5 ? colorA : colorB,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.1, 0.4, 0.1],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  )
}
