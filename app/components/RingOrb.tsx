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

  // Ring Wave - SPINNING and FLOWING ripples (The Ring movie style)
  class RingWave {
    index: number
    baseRadius: number
    amplitude: number
    frequency: number
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
    spinSpeed: number  // How fast wave spins around circle
    flowSpeed: number  // How fast ripple flows outward

    constructor(index: number, totalWaves: number) {
      this.index = index
      
      // EXACT same properties as Hero WaveBackground
      this.amplitude = Math.random() * 25 + 15  // 15-40
      this.frequency = Math.random() * 0.008 + 0.004  // 0.004-0.012
      this.phase = Math.random() * Math.PI * 2
      
      // EXACT visual properties from hero
      this.opacity = Math.random() * 0.5 + 0.3  // 0.3-0.8
      this.width = Math.random() * 1.5 + 1  // 1-2.5
      this.color = this.getElectricPurple()
      
      // Animation properties
      this.pulsePhase = Math.random() * Math.PI * 2
      this.pulseSpeed = Math.random() * 0.015 + 0.005
      this.waveLength = Math.random() * 100 + 50
      this.complexity = Math.random() * 0.5 + 0.5
      
      // Ring-specific: spread rings outward (concentric circles)
      const normalized = index / totalWaves
      this.baseRadius = 50 + (normalized * 90)  // Spread from 50 to 140
      
      // SPINNING: Each wave spins at different speed (like The Ring)
      this.spinSpeed = 0.01 + (normalized * 0.02)  // Faster outer rings
      
      // FLOWING: Ripples flow outward (expansion speed)
      this.flowSpeed = 0.003 + (normalized * 0.005)  // Outer ripples flow faster
      
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

    update(time: number, maxRadius: number) {
      // SPINNING: Wave rotates around circle continuously
      this.phase += this.spinSpeed
      
      // FLOWING: Ripples expand outward like The Ring well
      // Each ring flows at different phase (creates wave effect)
      const flowPhase = time * this.flowSpeed + (this.index * 0.5)
      const flowOffset = Math.sin(flowPhase) * 8  // Larger flow range
      
      // Base radius with flow - CONSTRAINED to not exceed canvas
      const targetBase = 50 + (this.index / 8 * 90)
      this.baseRadius = Math.min(targetBase + flowOffset, maxRadius - this.currentAmplitude - 10)
      
      // Keep opacity constant (no breathing) - just spinning and flowing
      this.currentOpacity = this.opacity
      this.currentAmplitude = this.amplitude
    }

    draw(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
      ctx.save()
      
      // EXACT same blend mode as hero
      ctx.globalCompositeOperation = 'screen'
      
      // High-quality rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Create radial gradient for glow
      const gradient = ctx.createRadialGradient(
        centerX, centerY, this.baseRadius - this.currentAmplitude,
        centerX, centerY, this.baseRadius + this.currentAmplitude * 2
      )
      
      // EXACT same gradient stops as hero
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
      
      // Ultra-smooth circle: 360 points (one per degree)
      const points = 360
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        
        // EXACT same wave math as hero, but using angle instead of x
        // SPINNING: phase increases → wave rotates around circle
        const baseWave = Math.sin((angle * this.frequency) + this.phase) * this.currentAmplitude
        const secondaryWave = Math.sin((angle * this.frequency * 1.5) + this.phase * 1.2) * this.currentAmplitude * 0.2
        
        const finalRadius = this.baseRadius + baseWave + secondaryWave
        
        const x = centerX + Math.cos(angle) * finalRadius
        const y = centerY + Math.sin(angle) * finalRadius
        
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

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // FULL CLEAR - NO FADE TRAIL (eliminates black square!)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // PERFECT CENTER - Use size (not scaled canvas dimensions)
    const centerX = size / 2
    const centerY = size / 2
    
    // Initialize waves once (8 rings like hero has 8 waves)
    if (wavesRef.current.length === 0) {
      for (let i = 0; i < 8; i++) {
        wavesRef.current.push(new RingWave(i, 8))
      }
    }
    
    // Calculate max radius to prevent cutoff (leave 10px margin)
    const maxRadius = (size / 2) - 10
    
    // Update and draw all waves with SPINNING and FLOWING
    wavesRef.current.forEach(wave => {
      wave.update(timeRef.current, maxRadius)
      wave.draw(ctx, centerX, centerY)
    })
    
    timeRef.current += 16  // 60fps timing
    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // High-DPI rendering for crisp quality
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = size + 'px'
    canvas.style.height = size + 'px'

    // Scale context for high-DPI
    const ctx = canvas.getContext('2d', { alpha: true })
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
      {/* Canvas - FULLY TRANSPARENT, perfectly centered */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 m-auto"
        style={{ 
          width: size, 
          height: size,
          backgroundColor: 'transparent',
          display: 'block'
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
