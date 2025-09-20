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
    <div className={`absolute inset-0 overflow-visible pointer-events-none ${className}`} style={{ zIndex: 999 }}>
      {/* DEBUG: Lines at button height with maximum z-index */}
      <div 
        className="absolute"
        style={{
          top: '60%',
          left: '-50vw',
          width: '200vw',
          height: '20px',
          background: 'red',
          zIndex: 9999,
          position: 'fixed'
        }}
      >
        RED LINE AT BUTTON HEIGHT
      </div>
      
      <div 
        className="absolute"
        style={{
          top: '65%',
          left: '-50vw',
          width: '200vw',
          height: '20px',
          background: 'blue',
          zIndex: 9999,
          position: 'fixed'
        }}
      >
        BLUE LINE AT BUTTON HEIGHT
      </div>
      
      <div 
        className="absolute"
        style={{
          top: '70%',
          left: '-50vw',
          width: '200vw',
          height: '20px',
          background: 'green',
          zIndex: 9999,
          position: 'fixed'
        }}
      >
        GREEN LINE AT BUTTON HEIGHT
      </div>
    </div>
  )
}
