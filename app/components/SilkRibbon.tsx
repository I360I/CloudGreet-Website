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
      {/* 3D blue wavy lines with different opacities - always across screen */}
      {Array.from({ length: 6 }).map((_, i) => {
        // Lowered slightly and closer together for overlap
        const startTop = 37 + i * 1.2; // Lowered from 35 to 37
        const opacities = [0.3, 0.5, 0.4, 0.6, 0.35, 0.45]; // Different opacities
        const widths = [3, 4, 2.5, 3.5, 2, 4.5];
        const durations = [12, 15, 10, 18, 14, 16];
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: '100vw', // Full screen width
              height: `${widths[i]}px`,
              top: `${startTop}%`,
              left: '0',
              background: `linear-gradient(90deg, transparent, rgba(106, 167, 255, ${opacities[i]}), transparent)`,
              borderRadius: '50px',
              filter: 'blur(0.5px)',
              boxShadow: `0 0 20px rgba(106, 167, 255, ${opacities[i] * 0.5}), 0 0 40px rgba(106, 167, 255, ${opacities[i] * 0.3})`,
              zIndex: 10 - i, // Layering for 3D effect
            }}
            animate={{
              x: [0, 0], // No horizontal movement - stay in place
              opacity: [opacities[i], opacities[i] * 1.3, opacities[i]], // Subtle opacity pulse
              scaleY: [1, 1.6, 0.7, 2, 1], // Wave-like vertical scaling
              scaleX: [1, 1.05, 0.95, 1.1, 1], // Subtle width variation
              rotateX: [0, 5, -3, 8, 0], // 3D rotation effect
            }}
            transition={{
              duration: durations[i],
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: i * 1.5, // Staggered delays
            }}
          />
        );
      })}
    </div>
  )
}
