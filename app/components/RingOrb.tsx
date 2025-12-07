"use client"

import React, { useRef, useEffect, useCallback } from 'react'
import { Phone } from 'lucide-react'

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
  const wavesRef = useRef<RingWave[]>([])

  // EXACT COPY of Hero WaveBackground wave class, but converted to circular rings
  class RingWave {
    canvas: HTMLCanvasElement
    index: number
    centerX: number
    centerY: number
    baseRadius: number
    amplitude: number
    frequency: number
    speed: number
    phase: number
    opacity: number
    width: number
    color: string
    pulsePhase: number
    pulseSpeed: number
    waveLength: number
    complexity: number
    currentOpacity: number
    currentAmplitude: number

    constructor(canvas: HTMLCanvasElement, index: number, centerX: number, centerY: number) {
      this.canvas = canvas
      this.index = index
      this.centerX = centerX
      this.centerY = centerY
      
      // EXACT same properties as Hero WaveBackground
      this.amplitude = Math.random() * 25 + 15  // 15-40 (same as hero)
      this.frequency = Math.random() * 0.008 + 0.004  // 0.004-0.012 (same as hero)
      this.speed = 0.008  // Same phase speed as hero
      this.phase = Math.random() * Math.PI * 2
      
      // EXACT visual properties from hero
      this.opacity = Math.random() * 0.5 + 0.3  // 0.3-0.8 (same as hero)
      this.width = Math.random() * 1.5 + 1  // 1-2.5 (same as hero)
      this.color = this.getElectricPurple()
      
      // EXACT animation properties from hero
      this.pulsePhase = Math.random() * Math.PI * 2
      this.pulseSpeed = Math.random() * 0.015 + 0.005  // Same as hero
      this.waveLength = Math.random() * 100 + 50  // Same as hero
      this.complexity = Math.random() * 0.5 + 0.5  // Same as hero
      
      // Ring-specific: spread rings outward from center
      const normalized = index / 8  // 8 rings like hero has 8 waves
      this.baseRadius = 50 + (normalized * 80)  // Spread from 50 to 130
      
      this.currentOpacity = this.opacity
      this.currentAmplitude = this.amplitude
    }

    getElectricPurple() {
      // EXACT same color palette as Hero WaveBackground
      const vibrantPurples = [
        '#8B5CF6', // Purple-500
        '#A855F7', // Purple-600
        '#9333EA', // Purple-700
        '#C084FC', // Purple-400
        '#A78BFA', // Purple-500
        '#8B5CF6', // Purple-500
      ]
      return vibrantPurples[Math.floor(Math.random() * vibrantPurples.length)]
    }

    update() {
      // EXACT same update logic as hero
      this.phase += this.speed
      this.pulsePhase += this.pulseSpeed
      
      // EXACT same pulse calculation as hero
      const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8  // 0.6 to 1.0
      this.currentOpacity = this.opacity * pulse
      this.currentAmplitude = this.amplitude * (0.9 + pulse * 0.2)
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      
      // EXACT same blend mode as hero
      ctx.globalCompositeOperation = 'screen'
      
      // High-quality rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Create radial gradient for glow (like hero's linear gradient but radial)
      const gradient = ctx.createRadialGradient(
        this.centerX, this.centerY, this.baseRadius - this.currentAmplitude,
        this.centerX, this.centerY, this.baseRadius + this.currentAmplitude * 2
      )
      
      // EXACT same gradient stops as hero (converted to radial)
      const createColorWithAlpha = (color: string, alpha: number) => {
        const clampedAlpha = Math.max(0, Math.min(1, alpha))
        const alphaHex = Math.floor(clampedAlpha * 255).toString(16).padStart(2, '0')
        return `${color}${alphaHex}`
      }
      
      gradient.addColorStop(0, createColorWithAlpha(this.color, 0))
      gradient.addColorStop(0.2, createColorWithAlpha(this.color, this.currentOpacity * 0.1))
      gradient.addColorStop(0.4, createColorWithAlpha(this.color, this.currentOpacity * 0.4))
      gradient.addColorStop(0.6, createColorWithAlpha(this.color, this.currentOpacity * 0.8))
      gradient.addColorStop(0.8, createColorWithAlpha(this.color, this.currentOpacity))
      gradient.addColorStop(1, createColorWithAlpha(this.color, 0))
      
      ctx.strokeStyle = gradient
      ctx.lineWidth = this.width
      ctx.lineCap = 'round'
      ctx.shadowColor = this.color
      ctx.shadowBlur = 12  // EXACT same as hero
      
      ctx.beginPath()
      
      // EXACT same wave calculation as hero, but for circular path
      const points = 360  // One point per degree for smooth circle
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        
        // EXACT same wave math as hero (x * frequency → angle * frequency)
        const baseWave = Math.sin((angle * this.frequency) + this.phase) * this.currentAmplitude
        const secondaryWave = Math.sin((angle * this.frequency * 1.5) + this.phase * 1.2) * this.currentAmplitude * 0.2
        
        const finalRadius = this.baseRadius + baseWave + secondaryWave
        
        const x = this.centerX + Math.cos(angle) * finalRadius
        const y = this.centerY + Math.sin(angle) * finalRadius
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.stroke()
      
      // EXACT same glow layer as hero
      ctx.strokeStyle = createColorWithAlpha(this.color, this.currentOpacity * 0.2)
      ctx.lineWidth = this.width * 1.8
      ctx.shadowBlur = 12
      ctx.stroke()
      
      ctx.restore()
    }
  }

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })  // IMPORTANT: alpha channel enabled
    if (!ctx) return

    // EXACT same clear method as hero (subtle fade for trails)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    // Initialize waves once (8 rings like hero has 8 waves)
    if (wavesRef.current.length === 0) {
      for (let i = 0; i < 8; i++) {
        wavesRef.current.push(new RingWave(canvas, i, centerX, centerY))
      }
    }
    
    // Update and draw all waves
    wavesRef.current.forEach(wave => {
      wave.update()
      wave.draw(ctx)
    })
    
    timeRef.current += 16  // Same as hero (60fps timing)
    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = size + 'px'
    canvas.style.height = size + 'px'

    // Scale context for high-DPI displays
    const ctx = canvas.getContext('2d', { alpha: true })  // CRITICAL: alpha channel for transparency
    if (ctx) {
      ctx.scale(dpr, dpr)
      // Clear to fully transparent
      ctx.clearRect(0, 0, size, size)
    }

    // Reset waves on mount/resize
    wavesRef.current = []
    timeRef.current = 0

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
      {/* Canvas - FULLY TRANSPARENT, no black background */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0"
        style={{ 
          width: size, 
          height: size,
          backgroundColor: 'transparent'  // Explicit transparent background
        }}
      />
      {isClickable && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 backdrop-blur-sm border-2 border-purple-400/30 flex items-center justify-center hover:bg-purple-500/20 hover:border-purple-400/50 transition-all duration-300 pointer-events-auto shadow-lg shadow-purple-500/20">
            <Phone className="w-10 h-10 text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
          </div>
        </div>
      )}
    </div>
  )
}

export default RingOrb
