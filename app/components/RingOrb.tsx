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

  // Ring Wave class - EXACT match to hero wave style but circular
  class RingWave {
    canvas: HTMLCanvasElement
    index: number
    centerX: number
    centerY: number
    radius: number
    amplitude: number
    frequency: number
    phase: number
    opacity: number
    width: number
    color: string
    pulsePhase: number
    pulseSpeed: number
    currentAmplitude: number
    currentOpacity: number

    constructor(canvas: HTMLCanvasElement, index: number, centerX: number, centerY: number, radius: number) {
      this.canvas = canvas
      this.index = index
      this.centerX = centerX
      this.centerY = centerY
      this.radius = radius
      
      // EXACT properties from hero WaveBackground
      this.amplitude = Math.random() * 25 + 15
      this.frequency = Math.random() * 0.008 + 0.004
      this.phase = Math.random() * Math.PI * 2
      this.opacity = Math.random() * 0.5 + 0.3
      this.width = Math.random() * 1.5 + 1
      this.color = this.getElectricPurple()
      this.pulsePhase = Math.random() * Math.PI * 2
      this.pulseSpeed = Math.random() * 0.015 + 0.005
      this.currentAmplitude = this.amplitude
      this.currentOpacity = this.opacity
    }

    getElectricPurple() {
      const vibrantPurples = [
        '#8B5CF6', '#A855F7', '#9333EA', '#C084FC', '#A78BFA'
      ]
      return vibrantPurples[Math.floor(Math.random() * vibrantPurples.length)]
    }

    update() {
      // EXACT update from hero
      this.phase += 0.008
      this.pulsePhase += this.pulseSpeed
      
      const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8
      this.currentAmplitude = this.amplitude * (0.9 + pulse * 0.2)
      this.currentOpacity = this.opacity * pulse
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      
      // Smooth gradient for glow
      const gradient = ctx.createRadialGradient(
        this.centerX, this.centerY, this.radius - this.currentAmplitude,
        this.centerX, this.centerY, this.radius + this.currentAmplitude
      )
      
      const createColorWithAlpha = (color: string, alpha: number) => {
        const clampedAlpha = Math.max(0, Math.min(1, alpha))
        const alphaHex = Math.floor(clampedAlpha * 255).toString(16).padStart(2, '0')
        return `${color}${alphaHex}`
      }
      
      gradient.addColorStop(0, createColorWithAlpha(this.color, 0))
      gradient.addColorStop(0.4, createColorWithAlpha(this.color, this.currentOpacity * 0.4))
      gradient.addColorStop(0.6, createColorWithAlpha(this.color, this.currentOpacity * 0.8))
      gradient.addColorStop(0.8, createColorWithAlpha(this.color, this.currentOpacity))
      gradient.addColorStop(1, createColorWithAlpha(this.color, 0))
      
      ctx.strokeStyle = gradient
      ctx.lineWidth = this.width
      ctx.lineCap = 'round'
      ctx.shadowColor = this.color
      ctx.shadowBlur = 12
      
      ctx.beginPath()
      
      // Draw smooth circular wave
      const points = 360 // More points for smoother circle
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        
        // EXACT wave calculation from hero
        const baseWave = Math.sin(angle * 8 + this.phase) * this.currentAmplitude
        const secondaryWave = Math.sin(angle * 12 + this.phase * 1.2) * this.currentAmplitude * 0.2
        
        const finalRadius = this.radius + baseWave + secondaryWave
        
        const x = this.centerX + Math.cos(angle) * finalRadius
        const y = this.centerY + Math.sin(angle) * finalRadius
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.closePath()
      ctx.stroke()
      
      // Add glow layer like hero
      ctx.strokeStyle = createColorWithAlpha(this.color, this.currentOpacity * 0.2)
      ctx.lineWidth = this.width * 1.8
      ctx.stroke()
      
      ctx.restore()
    }
  }

  const wavesRef = useRef<RingWave[]>([])

  const drawRing = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear with subtle fade for smooth trails (like hero)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const baseRadius = size * 0.35
    
    // Initialize waves once
    if (wavesRef.current.length === 0) {
      for (let i = 0; i < 8; i++) {
        const radiusOffset = (i - 4) * 8
        wavesRef.current.push(new RingWave(canvas, i, centerX, centerY, baseRadius + radiusOffset))
      }
    }
    
    // Update and draw all waves
    wavesRef.current.forEach(wave => {
      wave.update()
      wave.draw(ctx)
    })
    
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
