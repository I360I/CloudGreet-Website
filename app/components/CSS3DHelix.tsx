"use client"

import React from 'react'
import { motion } from 'framer-motion'

interface CSS3DHelixProps {
  className?: string
  speed?: number
  color?: string
}

export default function CSS3DHelix({ 
  className = "", 
  speed = 1, 
  color = "#6AA7FF"
}: CSS3DHelixProps) {
  // Create multiple helix strands for a more complex 3D effect
  const strands = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 0.3,
    size: 0.8 + (i * 0.1),
    opacity: 0.3 + (i * 0.05),
    duration: 8 + (i * 2)
  }))

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ zIndex: 1 }}>
      {/* Multiple helix strands */}
      {strands.map((strand) => (
        <div key={strand.id} className="absolute inset-0 overflow-hidden">
          {/* Horizontal moving helix strand */}
          <motion.div
            className="absolute"
            style={{
              width: `${strand.size * 200}px`,
              height: `${strand.size * 200}px`,
              background: `radial-gradient(circle, ${color}${Math.floor(strand.opacity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
              borderRadius: '50%',
              filter: 'blur(1px)',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              x: [0, 100, -100, 0],
              y: [0, -50, 50, 0],
              scale: [1, 1.2, 0.8, 1],
              rotateZ: [0, 180, 360],
            }}
            transition={{
              duration: strand.duration * speed,
              repeat: Infinity,
              ease: "easeInOut",
              delay: strand.delay,
            }}
          />
          
          {/* Vertical helix movement */}
          <motion.div
            className="absolute"
            style={{
              width: `${strand.size * 150}px`,
              height: `${strand.size * 150}px`,
              background: `conic-gradient(from ${strand.id * 45}deg, ${color}${Math.floor(strand.opacity * 200).toString(16).padStart(2, '0')}, transparent, ${color}${Math.floor(strand.opacity * 200).toString(16).padStart(2, '0')})`,
              borderRadius: '50%',
              filter: 'blur(2px)',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{
              x: [-80, 80, -80],
              y: [0, -60, 60, 0],
              scale: [0.8, 1.3, 0.8],
              rotateZ: [0, 360],
            }}
            transition={{
              duration: strand.duration * speed * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: strand.delay + 1,
            }}
          />
        </div>
      ))}

      {/* Central rotating helix core */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          style={{
            width: '300px',
            height: '300px',
          }}
          animate={{
            rotateZ: [0, 360],
          }}
          transition={{
            duration: 12 * speed,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Multiple rotating elements for helix effect */}
          {Array.from({ length: 6 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                width: `${20 + i * 8}px`,
                height: `${20 + i * 8}px`,
                background: `radial-gradient(circle, ${color}${Math.floor((0.4 + i * 0.1) * 255).toString(16).padStart(2, '0')}, transparent 80%)`,
                borderRadius: '50%',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotateZ(${i * 60}deg) translateY(-${40 + i * 15}px)`,
                filter: 'blur(1px)',
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* Floating helix particles */}
      {Array.from({ length: 12 }, (_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute"
          style={{
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            background: color,
            borderRadius: '50%',
            left: `${20 + i * 7}%`,
            top: `${30 + (i % 3) * 20}%`,
            filter: 'blur(0.5px)',
            opacity: 0.6,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.sin(i) * 50, 0],
            scale: [1, 1.5, 1],
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{
            duration: 6 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4,
          }}
        />
      ))}
    </div>
  )
}
