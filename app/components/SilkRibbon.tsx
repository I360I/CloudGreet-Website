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
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={{ zIndex: 1 }}>
      {/* Horizontal flowing waves across entire screen */}
      {Array.from({ length: 3 }).map((_, i) => {
        const waveHeight = 60 + i * 40; // Position waves vertically
        const waveDelay = i * 2;
        const waveDuration = 8 + i * 2;
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${waveHeight}%`,
              left: '-100%',
              width: '300%', // Extra wide to ensure smooth looping
              height: '4px',
              background: `linear-gradient(90deg, 
                transparent, 
                ${colorA}40, 
                ${colorB}80, 
                ${colorA}60, 
                ${colorB}40, 
                transparent
              )`,
              borderRadius: '2px',
              zIndex: 1,
              boxShadow: `0 0 20px ${colorA}60, 0 0 40px ${colorB}40`,
              filter: 'blur(1px)',
              transform: 'translateZ(0)', // 3D hardware acceleration
            }}
            animate={{
              x: ['0vw', '100vw'], // Smooth horizontal movement
              opacity: [0.3, 0.8, 0.3],
              scaleY: [1, 1.5, 1],
            }}
            transition={{
              x: {
                duration: waveDuration,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear', // Constant speed for smooth flow
              },
              opacity: {
                duration: 4,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              },
              scaleY: {
                duration: 6,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              },
            }}
            initial={{
              x: '-100vw',
              opacity: 0.3,
              scaleY: 1,
            }}
          />
        );
      })}
      
      {/* Secondary layer for depth and complexity */}
      {Array.from({ length: 2 }).map((_, i) => {
        const waveHeight = 50 + i * 60;
        const waveDelay = i * 3;
        const waveDuration = 12 + i * 4;
        
        return (
          <motion.div
            key={`secondary-${i}`}
            className="absolute"
            style={{
              top: `${waveHeight}%`,
              left: '-100%',
              width: '300%',
              height: '2px',
              background: `linear-gradient(90deg, 
                transparent, 
                ${colorB}30, 
                ${colorA}50, 
                ${colorB}30, 
                transparent
              )`,
              borderRadius: '1px',
              zIndex: 1,
              boxShadow: `0 0 15px ${colorB}50`,
              filter: 'blur(0.5px)',
              transform: 'translateZ(0)',
            }}
            animate={{
              x: ['0vw', '100vw'],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              x: {
                duration: waveDuration,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear',
                delay: waveDelay,
              },
              opacity: {
                duration: 5,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              },
            }}
            initial={{
              x: '-100vw',
              opacity: 0.2,
            }}
          />
        );
      })}
      
      {/* Glowing particles for extra premium feel */}
      {Array.from({ length: 8 }).map((_, i) => {
        const particleDelay = i * 0.5;
        const particleDuration = 6 + i * 0.5;
        
        return (
          <motion.div
            key={`particle-${i}`}
            className="absolute"
            style={{
              top: `${45 + (i * 8)}%`,
              left: `${i * 12.5}%`,
              width: '6px',
              height: '6px',
              background: `radial-gradient(circle, ${colorA}80, transparent)`,
              borderRadius: '50%',
              zIndex: 1,
              boxShadow: `0 0 20px ${colorA}60`,
              filter: 'blur(0.5px)',
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.9, 0.3],
              scale: [1, 1.5, 1],
              x: [0, 50, 0],
            }}
            transition={{
              duration: particleDuration,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: particleDelay,
            }}
          />
        );
      })}
    </div>
  )
}
