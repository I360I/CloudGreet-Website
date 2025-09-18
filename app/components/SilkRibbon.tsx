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
      {/* Simple flowing wave lines */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full h-px opacity-30"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorA}, ${colorB}, transparent)`,
            top: `${15 + i * 18}%`,
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: 20 + i * 3,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
            delay: i * 2,
          }}
        />
      ))}
      
      {/* Flowing ribbons with wave effect */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={`ribbon-${i}`}
          className="absolute w-full opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorB}80, ${colorA}80, transparent)`,
            height: '2px',
            top: `${25 + i * 25}%`,
            filter: 'blur(0.5px)',
          }}
          animate={{
            x: ['-120%', '120%'],
            opacity: [0.05, 0.3, 0.05],
            scaleY: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 25 + i * 5,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: i * 3,
          }}
        />
      ))}
      
      {/* Gentle wave particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-2 h-2 opacity-20 rounded-full"
          style={{
            background: `radial-gradient(circle, ${colorA}, ${colorB})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [0.1, 0.3, 0.1],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 6 + Math.random() * 4,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  )
}
