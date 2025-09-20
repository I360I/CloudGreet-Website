"use client"

import React from 'react'
import { motion } from 'framer-motion'

interface LightBackgroundProps {
  className?: string
  colorA?: string
  colorB?: string
  opacity?: number
}

export default function LightBackground({
  className = "",
  colorA = "#6AA7FF",
  colorB = "#A06BFF",
  opacity = 0.6
}: LightBackgroundProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ zIndex: 1 }}>
      {/* Animated gradient circles */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${100 + i * 50}px`,
            height: `${100 + i * 50}px`,
            background: `radial-gradient(circle, ${colorA}${Math.floor(opacity * 20)}, transparent 70%)`,
            left: `${20 + i * 15}%`,
            top: `${30 + i * 10}%`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [opacity * 0.3, opacity * 0.8, opacity * 0.3],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}
      
      {/* Flowing lines */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={`line-${i}`}
          className="absolute h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorB}${Math.floor(opacity * 100)}, transparent)`,
            width: '200%',
            left: '-50%',
            top: `${40 + i * 20}%`,
            opacity: opacity * 0.5,
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0, opacity * 0.8, 0],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "linear",
            delay: i * 2,
          }}
        />
      ))}
    </div>
  )
}
