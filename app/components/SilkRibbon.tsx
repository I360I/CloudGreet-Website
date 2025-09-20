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
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`} style={{ zIndex: 1, perspective: '1000px' }}>
      {/* Premium 3D Helix/DNA Animation */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45); // 45 degree increments for 8 strands
        const helixOffset = i * 0.1;
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: '60%',
              left: '50%',
              width: '200vw',
              height: '3px',
              background: `linear-gradient(90deg, 
                ${i % 2 === 0 ? colorA : colorB}, 
                ${i % 2 === 0 ? colorB : colorA}, 
                ${i % 2 === 0 ? colorA : colorB}
              )`,
              borderRadius: '2px',
              zIndex: 1,
              position: 'fixed',
              transformOrigin: 'center center',
              boxShadow: `0 0 20px ${i % 2 === 0 ? colorA : colorB}40`,
              filter: 'blur(0.5px)'
            }}
            animate={{
              rotateY: [0, 360],
              rotateX: [0, 180, 360],
              scaleY: [1, 2.5, 1],
              scaleX: [1, 1.1, 1],
              y: [0, -30, 15, -20, 0],
              opacity: [0.4, 0.9, 0.6, 0.8, 0.4],
              boxShadow: [
                `0 0 20px ${i % 2 === 0 ? colorA : colorB}40`,
                `0 0 40px ${i % 2 === 0 ? colorA : colorB}80`,
                `0 0 30px ${i % 2 === 0 ? colorA : colorB}60`,
                `0 0 35px ${i % 2 === 0 ? colorA : colorB}70`,
                `0 0 20px ${i % 2 === 0 ? colorA : colorB}40`
              ]
            }}
            transition={{
              duration: 12 + helixOffset * 10,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: helixOffset * 2,
            }}
            initial={{
              rotateY: angle,
              rotateX: 0,
            }}
          />
        );
      })}
      
      {/* Secondary helix layer for depth */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60) + 22.5; // Offset for interweaving
        const helixOffset = i * 0.15;
        
        return (
          <motion.div
            key={`secondary-${i}`}
            className="absolute"
            style={{
              top: '70%',
              left: '50%',
              width: '180vw',
              height: '2px',
              background: `linear-gradient(90deg, 
                ${colorA}60, 
                ${colorB}80, 
                ${colorA}60
              )`,
              borderRadius: '1px',
              zIndex: 1,
              position: 'fixed',
              transformOrigin: 'center center',
              boxShadow: `0 0 15px ${colorA}30`,
              filter: 'blur(0.3px)'
            }}
            animate={{
              rotateY: [0, -360],
              rotateX: [0, -180, -360],
              scaleY: [1, 2, 1],
              y: [0, 25, -10, 20, 0],
              opacity: [0.3, 0.7, 0.4, 0.6, 0.3],
            }}
            transition={{
              duration: 15 + helixOffset * 8,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: helixOffset * 3,
            }}
            initial={{
              rotateY: angle,
              rotateX: 0,
            }}
          />
        );
      })}
    </div>
  )
}
