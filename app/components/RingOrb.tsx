"use client"

import React, { useRef, useEffect, useCallback } from 'react'

interface RingOrbProps {
  size?: number
  className?: string
  onClick?: () => void
  isClickable?: boolean
}

const RingOrb: React.FC<RingOrbProps> = ({ 
  size = 300, 
  className = '', 
  onClick, 
  isClickable = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const wavesRef = useRef<Wave[]>([])

  class Wave {
    baseRadius: number
    amplitude: number
    frequency: number
    speed: number
    phase: number
    opacity: number
    width: number
    color: string

    constructor(index: number) {
      this.baseRadius = 80 + (index * 12) // Spread out rings
      this.amplitude = 8 + Math.random() * 4
      this.frequency = 0.01 + Math.random() * 0.01
      this.speed = 0.3 + Math.random() * 0.3
      this.phase = Math.random() * Math.PI * 2
      this.opacity = 0.6 + Math.random() * 0.4 // BRIGHT
      this.width = 2 + Math.random() * 1
      
      // BRIGHT electric purple/blue colors
      const colors = [
        'rgba(168, 85, 247, 1)',   // Bright purple
        'rgba(139, 92, 246, 1)',   // Medium purple
        'rgba(192, 132, 252, 1)',  // Light purple
        'rgba(147, 197, 253, 1)',  // Sky blue
      ]
      this.color = colors[index % colors.length]
    }

    update() {
      this.phase += this.speed * 0.02
    }

    draw(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen' // ADD light (makes it brighter)
      ctx.shadowBlur = 20
      ctx.shadowColor = this.color
      ctx.strokeStyle = this.color.replace('1)', `${this.opacity})`)
      ctx.lineWidth = this.width
      ctx.lineCap = 'round'
      ctx.beginPath()

      const points = 200 // Smooth circle
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        
        // Wave calculation
        const wave1 = Math.sin((angle * 8 * this.frequency) + this.phase) * this.amplitude
        const wave2 = Math.sin((angle * 12 * this.frequency * 1.3) + this.phase * 1.2) * this.amplitude * 0.3
        
        const radius = this.baseRadius + wave1 + wave2
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.closePath()
      ctx.stroke()
      
      // Extra glow pass
      ctx.globalAlpha = 0.3
      ctx.lineWidth = this.width * 2
      ctx.stroke()
      
      ctx.restore()
    }
  }

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear with SLIGHT fade (not too dark)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    // Initialize waves once
    if (wavesRef.current.length === 0) {
      for (let i = 0; i < 6; i++) {
        wavesRef.current.push(new Wave(i))
      }
    }
    
    // Draw all waves
    wavesRef.current.forEach(wave => {
      wave.update()
      wave.draw(ctx, centerX, centerY)
    })
    
    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = size
    canvas.height = size

    // Start with black background
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgb(0, 0, 0)'
      ctx.fillRect(0, 0, size, size)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [size, animate])

  return (
    <div 
      className={`relative flex items-center justify-center ${isClickable ? 'cursor-pointer hover:scale-105' : ''} transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <canvas 
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: size, height: size }}
      />
      {isClickable && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/20 backdrop-blur-sm border border-purple-400/40 flex items-center justify-center hover:bg-purple-500/30 transition-colors">
            <svg 
              className="w-8 h-8 text-purple-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

export default RingOrb
