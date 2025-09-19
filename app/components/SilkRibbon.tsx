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
      {/* DEBUG: Static test lines */}
      <div 
        className="absolute"
        style={{
          top: '20%',
          left: '0',
          width: '100%',
          height: '10px',
          background: 'red',
          zIndex: 100
        }}
      >
        STATIC RED LINE 1
      </div>
      
      <div 
        className="absolute"
        style={{
          top: '45%',
          left: '0',
          width: '100%',
          height: '10px',
          background: 'blue',
          zIndex: 100
        }}
      >
        STATIC BLUE LINE 2
      </div>
      
      <div 
        className="absolute"
        style={{
          top: '70%',
          left: '0',
          width: '100%',
          height: '10px',
          background: 'green',
          zIndex: 100
        }}
      >
        STATIC GREEN LINE 3
      </div>
    </div>
  )
}
