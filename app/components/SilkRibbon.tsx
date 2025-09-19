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
      {/* DNA-like overlapping wavy lines */}
      {Array.from({ length: 8 }).map((_, i) => {
        // Much closer together for DNA-like overlap
        const startTop = 37 + i * 0.8; // Very close spacing for overlap
        const opacities = [0.4, 0.6, 0.3, 0.5, 0.35, 0.45, 0.4, 0.55];
        const widths = [4, 5, 3, 4.5, 3.5, 5.5, 4, 6];
        const durations = [10, 12, 8, 14, 11, 13, 9, 15];
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: '100vw',
              height: `${widths[i]}px`,
              top: `${startTop}%`,
              left: '0',
              background: `linear-gradient(90deg, transparent, rgba(106, 167, 255, ${opacities[i]}), transparent)`,
              borderRadius: '50px',
              filter: 'blur(0.3px)',
              boxShadow: `0 0 25px rgba(106, 167, 255, ${opacities[i] * 0.6}), 0 0 50px rgba(106, 167, 255, ${opacities[i] * 0.4})`,
              zIndex: 15 - i, // Better layering for overlap
            }}
            animate={{
              x: [0, 0],
              opacity: [opacities[i], opacities[i] * 1.4, opacities[i]],
              // Much bigger waves - DNA-like amplitude
              scaleY: [1, 3, 0.3, 4, 0.5, 3.5, 1], // Bigger wave motion
              scaleX: [1, 1.2, 0.8, 1.3, 0.7, 1.1, 1], // More width variation
              rotateX: [0, 15, -10, 20, -8, 18, 0], // More dramatic 3D rotation
              rotateZ: [0, 5, -3, 8, -2, 6, 0], // DNA-like twisting
            }}
            transition={{
              duration: durations[i],
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: i * 0.6, // Closer delays for DNA pattern
            }}
          />
        );
      })}
    </div>
  )
}
