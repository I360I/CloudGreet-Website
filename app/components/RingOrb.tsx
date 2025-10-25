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

  // Ring Wave class - EXACT match to hero section waves but in ring formation
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
    complexity: number

    constructor(canvas: HTMLCanvasElement, index: number, centerX: number, centerY: number, radius: number) {
      this.canvas = canvas
      this.index = index
      this.centerX = centerX
      this.centerY = centerY
      this.radius = radius
      
      // EXACT wave properties from hero section
      this.amplitude = Math.random() * 25 + 15  // Same as hero: 15-40
      this.frequency = Math.random() * 0.008 + 0.004  // Same as hero: 0.004-0.012
      this.speed = Math.random() * 0.4 + 0.2  // Same as hero: 0.2-0.6
      this.phase = Math.random() * Math.PI * 2
      
      // EXACT visual properties from hero section
      this.opacity = Math.random() * 0.5 + 0.3  // Same as hero: 0.3-0.8
      this.width = Math.random() * 1.5 + 1  // Same as hero: 1-2.5
      this.color = this.getElectricPurple()
      
      // EXACT animation properties from hero section
      this.pulsePhase = Math.random() * Math.PI * 2
      this.pulseSpeed = Math.random() * 0.015 + 0.005  // Same as hero
      
      // Ring-specific properties - spread waves around circle
      this.angleOffset = (index / 4) * Math.PI * 2 // 4 waves around circle
      this.waveLength = Math.random() * 100 + 50  // Same as hero: 50-150
      this.complexity = Math.random() * 0.5 + 0.5  // Same as hero: 0.5-1.0
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
      // EXACT update logic from hero section
      this.phase += 0.008  // Same as hero: no horizontal movement, just phase
      this.pulsePhase += this.pulseSpeed
      
      // EXACT pulsing from hero section
      const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8  // Same as hero
      this.currentAmplitude = this.amplitude * (0.9 + pulse * 0.2)  // Same as hero
      this.currentOpacity = this.opacity * pulse  // Same as hero
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      
      // EXACT drawing setup from hero section
      ctx.globalCompositeOperation = 'screen'  // Same as hero
      
      // EXACT gradient setup from hero section
      const gradient = ctx.createRadialGradient(
        this.centerX, this.centerY, this.radius - this.currentAmplitude,
        this.centerX, this.centerY, this.radius + this.currentAmplitude
      )
      gradient.addColorStop(0, `${this.color}${Math.floor(this.currentOpacity * 255).toString(16).padStart(2, '0')}`)
      gradient.addColorStop(0.5, `${this.color}${Math.floor(this.currentOpacity * 0.6 * 255).toString(16).padStart(2, '0')}`)
      gradient.addColorStop(1, `${this.color}00`)
      
      ctx.strokeStyle = gradient
      ctx.lineWidth = this.width
      ctx.globalAlpha = this.currentOpacity
      
      // EXACT glow effect from hero section
      ctx.shadowColor = this.color
      ctx.shadowBlur = 20
      
      ctx.beginPath()
      
      // Draw circular wave with EXACT same complexity as hero section
      const points = 200
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2 + this.angleOffset
        
        // EXACT wave calculation from hero section
        const baseWave = Math.sin(angle * this.frequency + this.phase) * this.currentAmplitude
        
        // EXACT secondary wave from hero section
        const secondaryWave = Math.sin(angle * this.frequency * 2 + this.phase * 1.5) * this.currentAmplitude * 0.3
        
        // EXACT complexity calculation from hero section
        const complexityWave = Math.sin(angle * this.frequency * 3 + this.phase * 0.7) * this.currentAmplitude * 0.15 * this.complexity
        
        const finalRadius = this.radius + baseWave + secondaryWave + complexityWave
        
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
    
    // Create 4 ring waves (like the Ring movie) - UNSYMMETRICAL
    const waves = []
    for (let i = 0; i < 4; i++) {
      const wave = new RingWave(canvas, i, centerX, centerY, baseRadius)
      // Make waves unsymmetrical by varying their starting positions
      wave.angleOffset += (Math.random() - 0.5) * Math.PI * 0.5  // Random offset for unsymmetrical look
      waves.push(wave)
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
