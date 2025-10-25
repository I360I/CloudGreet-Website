"use client"

import React from 'react'

interface SimpleRingOrbProps {
  size?: number
  className?: string
  onClick?: () => void
  isClickable?: boolean
}

const SimpleRingOrb: React.FC<SimpleRingOrbProps> = ({ 
  size = 300, 
  className = '', 
  onClick, 
  isClickable = false 
}) => {
  return (
    <div 
      className={`relative flex items-center justify-center ${isClickable ? 'cursor-pointer hover:scale-105 transition-transform duration-300' : ''} ${className}`} 
      style={{ width: size, height: size }}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Simple ring with CSS animation */}
      <div className="absolute inset-0 rounded-full border-4 border-purple-500 animate-pulse"></div>
      <div className="absolute inset-4 rounded-full border-2 border-purple-400 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute inset-8 rounded-full border-2 border-purple-300 animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* Center void */}
      <div className="w-16 h-16 bg-black rounded-full border-2 border-purple-600 flex items-center justify-center">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
      </div>
    </div>
  )
}

export default SimpleRingOrb
