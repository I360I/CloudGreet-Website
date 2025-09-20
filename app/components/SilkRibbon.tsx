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
      {/* Wavy lines that actually bend like strings */}
      {Array.from({ length: 2 }).map((_, i) => {
        const startTop = 65 + i * 8;
        
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
              clipPath: [
                'polygon(0% 0%, 25% 0%, 50% 20%, 75% 0%, 100% 0%, 100% 100%, 75% 100%, 50% 80%, 25% 100%, 0% 100%)',
                'polygon(0% 0%, 25% 0%, 50% -15%, 75% 0%, 100% 0%, 100% 100%, 75% 100%, 50% 115%, 25% 100%, 0% 100%)',
                'polygon(0% 0%, 25% 0%, 50% 10%, 75% 0%, 100% 0%, 100% 100%, 75% 100%, 50% 90%, 25% 100%, 0% 100%)',
                'polygon(0% 0%, 25% 0%, 50% -8%, 75% 0%, 100% 0%, 100% 100%, 75% 100%, 50% 108%, 25% 100%, 0% 100%)',
                'polygon(0% 0%, 25% 0%, 50% 20%, 75% 0%, 100% 0%, 100% 100%, 75% 100%, 50% 80%, 25% 100%, 0% 100%)'
              ],
              opacity: [0.6, 0.9, 0.7, 0.8, 0.6]
            }}
            transition={{
              duration: 6 + i * 2,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: i * 1.5,
            }}
          />
        );
      })}
    </div>
  )
}
