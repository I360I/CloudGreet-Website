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
  console.log('SilkRibbon component is rendering!');
  return (
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`} style={{ zIndex: 1 }}>
      {/* Wavy lines that actually bend like waves */}
      {Array.from({ length: 3 }).map((_, i) => {
        const startTop = 60 + i * 5;
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${startTop}%`,
              left: '-50vw',
              width: '200vw',
              height: '8px',
              background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #3B82F6)',
              borderRadius: '4px',
              zIndex: 1,
              position: 'fixed'
            }}
            animate={{
              x: [0, 100, 0],
              scaleX: [1, 1.2, 1],
              scaleY: [1, 1.8, 1],
              skewX: [0, 5, -5, 0],
              skewY: [0, 2, -2, 0],
              opacity: [0.6, 0.9, 0.6]
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: i * 1,
            }}
          />
        );
      })}
    </div>
  )
}
