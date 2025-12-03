"use client"

import React, { useRef, useEffect, useCallback, memo } from 'react'

interface RingOrbProps {
  size?: number
  className?: string
  onClick?: () => void
  isClickable?: boolean
}

const RingOrb: React.FC<RingOrbProps> = memo(({ 
  size = 300, 
  className = '', 
  onClick, 
  isClickable = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const timeRef = useRef(0)

  // Ring Wave class - EXACT match to WaveBackground ReferenceWave class
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
      
      // EXACT wave properties from WaveBackground ReferenceWave
      this.amplitude = Math.random() * 25 + 15  // Same as hero: 15-40
      this.frequency = Math.random() * 0.008 + 0.004  // Same as hero: 0.004-0.012
      this.speed = Math.random() * 0.4 + 0.2  // Same as hero: 0.2-0.6
      this.phase = Math.random() * Math.PI * 2
      
      // EXACT visual properties from WaveBackground
      this.opacity = Math.random() * 0.5 + 0.3  // Same as hero: 0.3-0.8
      this.width = Math.random() * 1.5 + 1  // Same as hero: 1-2.5
      this.color = this.getElectricPurple()
      
      // EXACT animation properties from WaveBackground
      this.pulsePhase = Math.random() * Math.PI * 2
      this.pulseSpeed = Math.random() * 0.015 + 0.005  // Same as hero
      
      // Wave characteristics - EXACT from WaveBackground
      this.waveLength = Math.random() * 100 + 50  // Same as hero: 50-150
      this.complexity = Math.random() * 0.5 + 0.5  // Same as hero: 0.5-1.0
      
      // Initialize current values
      this.currentAmplitude = this.amplitude
      this.currentOpacity = this.opacity
      
      // Ring-specific: spread waves around circle
      this.angleOffset = (index / 4) * Math.PI * 2 // 4 waves around circle
    }

    getElectricPurple() {
      // EXACT same colors as WaveBackground
      const vibrantPurples = [
        '#8B5CF6', // Purple-500 - bright and vibrant
        '#A855F7', // Purple-600 - rich and electric
        '#9333EA', // Purple-700 - deep and glowing
        '#C084FC', // Purple-400 - bright and luminous
        '#A78BFA', // Purple-500 - more saturated purple
        '#8B5CF6', // Purple-500 - consistent vibrant purple
      ]
      return vibrantPurples[Math.floor(Math.random() * vibrantPurples.length)]
    }

    update(time: number) {
      // EXACT update logic from WaveBackground ReferenceWave
      this.phase += 0.008  // Same as hero: no horizontal movement, just phase
      this.pulsePhase += this.pulseSpeed
      
      // EXACT pulsing from WaveBackground
      const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8  // Same as hero
      this.currentAmplitude = this.amplitude * (0.9 + pulse * 0.2)  // Same as hero
      this.currentOpacity = this.opacity * pulse  // Same as hero
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save()
      
      // EXACT drawing setup from WaveBackground
      ctx.globalCompositeOperation = 'screen'  // Same as hero
      
      // Create gradient matching WaveBackground style but for circular waves
      const createColorWithAlpha = (color: string, alpha: number) => {
        const clampedAlpha = Math.max(0, Math.min(1, alpha))
        const alphaHex = Math.floor(clampedAlpha * 255).toString(16).padStart(2, '0')
        return `${color}${alphaHex}`
      }
      
      // Radial gradient for circular waves (similar to linear gradient in WaveBackground)
      const gradient = ctx.createRadialGradient(
        this.centerX, this.centerY, this.radius - this.currentAmplitude,
        this.centerX, this.centerY, this.radius + this.currentAmplitude
      )
      gradient.addColorStop(0, createColorWithAlpha(this.color, 0))
      gradient.addColorStop(0.2, createColorWithAlpha(this.color, this.currentOpacity * 0.1))
      gradient.addColorStop(0.4, createColorWithAlpha(this.color, this.currentOpacity * 0.4))
      gradient.addColorStop(0.6, createColorWithAlpha(this.color, this.currentOpacity * 0.8))
      gradient.addColorStop(0.8, createColorWithAlpha(this.color, this.currentOpacity))
      gradient.addColorStop(1, createColorWithAlpha(this.color, 0))
      
      ctx.strokeStyle = gradient
      ctx.lineWidth = this.width
      ctx.lineCap = 'round'  // Same as WaveBackground
      ctx.shadowColor = this.color
      ctx.shadowBlur = 12  // Same as WaveBackground
      
      ctx.beginPath()
      
      // Draw circular wave with EXACT same wave calculation as WaveBackground
      const points = 200
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2 + this.angleOffset
        
        // EXACT wave calculation from WaveBackground (but for circular)
        const baseWave = Math.sin(angle * this.frequency + this.phase) * this.currentAmplitude
        const secondaryWave = Math.sin(angle * this.frequency * 1.5 + this.phase * 1.2) * this.currentAmplitude * 0.2
        
        const finalRadius = this.radius + baseWave + secondaryWave
        
        const x = this.centerX + Math.cos(angle) * finalRadius
        const y = this.centerY + Math.sin(angle) * finalRadius
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.stroke()
      
      // Add subtle glow layer - EXACT from WaveBackground
      ctx.strokeStyle = createColorWithAlpha(this.color, this.currentOpacity * 0.2)
      ctx.lineWidth = this.width * 1.8
      ctx.shadowBlur = 12
      ctx.stroke()
      
      ctx.restore()
    }
  }

  const drawRing = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear with subtle fade for trail effect - EXACT from WaveBackground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
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
    
    // Draw central void orb with pulsing glow - matching hero style
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
    
    // Draw center dot - matching hero purple
    ctx.save()
    ctx.fillStyle = '#A855F7'
    ctx.shadowColor = '#A855F7'
    ctx.shadowBlur = 12  // Same as WaveBackground shadowBlur
    ctx.beginPath()
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    
    // EXACT same time increment as WaveBackground (16ms per frame)
    timeRef.current += 16
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
    
    // Start animation - EXACT same timing as WaveBackground
    timeRef.current = 0
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate, size])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isClickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }, [isClickable, onClick])

  return (
    <div 
      className={`relative flex items-center justify-center ${isClickable ? 'cursor-pointer hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black' : ''} ${className}`} 
      style={{ width: size, height: size }}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? 'Click to initiate test call' : undefined}
      aria-describedby={isClickable ? 'ringOrbDescription' : undefined}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      {isClickable && (
        <span id="ringOrbDescription" className="sr-only">
          Interactive orb to initiate a test call with our AI receptionist. Enter your phone number above, then click or press Enter to start the call.
        </span>
      )}
    </div>
  )
})

RingOrb.displayName = 'RingOrb'

export default RingOrb
