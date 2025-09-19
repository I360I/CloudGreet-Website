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
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Simple working waves */}
      {Array.from({ length: 3 }).map((_, i) => {
        const startTop = 20 + i * 25;
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${startTop}%`,
              left: '-50vw',
              width: '200vw',
              height: '4px',
              background: 'linear-gradient(90deg, #00FF00, #FF0000, #0000FF)',
              borderRadius: '2px',
            }}
            animate={{
              x: [0, 100, 0],
              scaleY: [1, 1.5, 1],
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
