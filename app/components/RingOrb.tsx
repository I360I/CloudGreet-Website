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
  const timeRef = useRef(0)

  // Ring Wave class - circular version of the hero wave animation
  class RingWave {
    canvas: HTMLCanvasElement
    index: number
    centerX: number
    centerY: number
    radius: number
    amplitude: number
    frequency: number
    speed: number
    phase: number
    opacity: number
    width: number
    color: string
    pulsePhase: number
    pulseSpeed: number
    angleOffset: number
    waveLength: number
    currentAmplitude: number
    currentOpacity: number

    constructor(canvas: HTMLCanvasElement, index: number, centerX: number, centerY: number, radius: number) {
      this.canvas = canvas
      this.index = index
      this.centerX = centerX
      this.centerY = centerY
      this.radius = radius
      
      // Wave properties matching hero section exactly
      this.amplitude = Math.random() * 15 + 10
      this.frequency = Math.random() * 0.02 + 0.01
      this.speed = Math.random() * 0.008 + 0.004
      this.phase = Math.random() * Math.PI * 2
      
      // Visual properties - exact match to hero section
      this.opacity = Math.random() * 0.6 + 0.4
      this.width = Math.random() * 2 + 1.5
      this.color = this.getElectricPurple()
      
      // Animation properties
      this.pulsePhase = Math.random() * Math.PI * 2
      this.pulseSpeed = Math.random() * 0.015 + 0.005
      
      // Ring-specific properties
      this.angleOffset = (index / 4) * Math.PI * 2 // Spread 4 waves around circle
      this.waveLength = Math.random() * 50 + 30
    }

    getElectricPurple() {
      const vibrantPurples = [
        '#8B5CF6', // Purple-500 - bright and vibrant
        '#A855F7', // Purple-600 - rich and electric
        '#9333EA', // Purple-700 - deep and glowing
        '#C084FC', // Purple-400 - bright and luminous
        '#A78BFA', // Purple-500 - more saturated purple
      ]
      return vibrantPurples[Math.floor(Math.random() * vibrantPurples.length)]
    }

    update(time: number) {
      this.phase += this.speed
      this.pulsePhase += this.pulseSpeed
      
      // Pulsing amplitude like hero section
      const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7
      this.currentAmplitude = this.amplitude * pulse
      
      // Pulsing opacity like hero section
      this.currentOpacity = this.opacity * (Math.sin(this.pulsePhase * 0.7) * 0.2 + 0.8)
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      
      // Set up drawing properties
      ctx.strokeStyle = this.color
      ctx.lineWidth = this.width
      ctx.globalAlpha = this.currentOpacity
      
      // Create shadow/glow effect like hero section
      ctx.shadowColor = this.color
      ctx.shadowBlur = 15
      
      ctx.beginPath()
      
      // Draw circular wave with wavy distortion
      const points = 200
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2 + this.angleOffset
        const baseRadius = this.radius + Math.sin(angle * this.frequency + this.phase) * this.currentAmplitude
        
        // Add secondary wave for complexity like hero section
        const secondaryWave = Math.sin(angle * this.frequency * 2 + this.phase * 1.5) * this.currentAmplitude * 0.3
        const finalRadius = baseRadius + secondaryWave
        
        const x = this.centerX + Math.cos(angle) * finalRadius
        const y = this.centerY + Math.sin(angle) * finalRadius
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.stroke()
      ctx.restore()
    }
  }

  const drawRing = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const baseRadius = size * 0.3
    
    // Create 4 ring waves (like the Ring movie)
    const waves = []
    for (let i = 0; i < 4; i++) {
      waves.push(new RingWave(canvas, i, centerX, centerY, baseRadius))
    }
    
    // Update and draw all waves
    waves.forEach(wave => {
      wave.update(timeRef.current)
      wave.draw(ctx)
    })
    
    // Draw central void orb with pulsing glow
    const voidPulse = Math.sin(timeRef.current * 0.01) * 0.3 + 0.7
    const voidRadius = (size * 0.15) * voidPulse
    
    ctx.save()
    ctx.globalAlpha = 0.8
    ctx.fillStyle = 'radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.3) 100%)'
    ctx.shadowColor = '#A855F7'
    ctx.shadowBlur = 20 * voidPulse
    ctx.beginPath()
    ctx.arc(centerX, centerY, voidRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    
    // Draw center dot
    ctx.save()
    ctx.fillStyle = '#A855F7'
    ctx.shadowColor = '#A855F7'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    
    timeRef.current += 1
  }, [size])

  const animate = useCallback(() => {
    drawRing()
    animationRef.current = requestAnimationFrame(animate)
  }, [drawRing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    canvas.width = size
    canvas.height = size
    
    // Start animation
    animate()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate, size])

  return (
    <div 
      className={`relative flex items-center justify-center ${isClickable ? 'cursor-pointer hover:scale-105 transition-transform duration-300' : ''} ${className}`} 
      style={{ width: size, height: size }}
      onClick={isClickable ? onClick : undefined}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: size, height: size }}
      />
    </div>
  )
}

export default RingOrb