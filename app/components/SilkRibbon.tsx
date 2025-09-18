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
      {/* Wave-like flowing ribbons */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorA}, ${colorB}, ${colorA}, transparent)`,
            height: `${2 + i * 0.5}px`,
            top: `${20 + i * 15}%`,
            filter: 'blur(1px)',
          }}
          animate={{
            x: ['-120%', '120%'],
            opacity: [0.05, 0.25, 0.05],
            scaleY: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: i * 2,
          }}
        />
      ))}
      
      {/* Curved wave ribbons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={`curve-${i}`}
          className="absolute w-full opacity-15"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorB}, ${colorA}, ${colorB}, transparent)`,
            height: `${1.5 + i * 0.3}px`,
            top: `${30 + i * 20}%`,
            filter: 'blur(0.5px)',
            transform: `rotate(${i * 2 - 4}deg)`,
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0.08, 0.2, 0.08],
            rotate: [`${i * 2 - 4}deg`, `${i * 2 - 2}deg`, `${i * 2 - 4}deg`],
          }}
          transition={{
            duration: 18 + i * 3,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
            delay: i * 3 + 1,
          }}
        />
      ))}
      
      {/* Flowing silk-like waves */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={`silk-${i}`}
          className="absolute w-full opacity-10"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorA}40, ${colorB}60, ${colorA}40, transparent)`,
            height: `${3 + i * 1}px`,
            top: `${25 + i * 25}%`,
            filter: 'blur(2px)',
            borderRadius: '50%',
          }}
          animate={{
            x: ['-150%', '150%'],
            opacity: [0.03, 0.15, 0.03],
            scaleY: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 25 + i * 5,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'linear',
            delay: i * 4 + 2,
          }}
        />
      ))}
    </div>
  )
}
