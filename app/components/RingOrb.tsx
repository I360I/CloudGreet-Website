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
  const timeRef = useRef(0)

  class Wave {
    baseRadius: number
    amplitude: number
    frequencies: number[]
    speeds: number[]
    phases: number[]
    opacity: number
    width: number
    color: string
    pulsePhase: number
    pulseSpeed: number
    complexityLayers: number

    constructor(index: number, totalWaves: number) {
      // Spread rings naturally with golden ratio spacing
      const goldenRatio = (1 + Math.sqrt(5)) / 2
      const normalized = index / totalWaves
      this.baseRadius = 60 + (normalized * 80) + (Math.sin(normalized * Math.PI) * 15)
      
      // High-quality multi-frequency wave system (like real fluid dynamics)
      this.complexityLayers = 5 // Multiple sine waves for organic shape
      this.frequencies = []
      this.speeds = []
      this.phases = []
      
      for (let i = 0; i < this.complexityLayers; i++) {
        // Natural frequency distribution (like harmonics in music)
        this.frequencies.push(4 + i * 2 + Math.random() * 1.5)
        this.speeds.push(0.008 + Math.random() * 0.012)
        this.phases.push(Math.random() * Math.PI * 2)
      }
      
      // Amplitude varies with distance (outer rings more wavy)
      this.amplitude = 6 + (normalized * 8) + Math.random() * 3
      
      // Beautiful purple gradient colors
      const colorPalette = [
        { r: 168, g: 85, b: 247 },   // Electric purple
        { r: 139, g: 92, b: 246 },   // Deep purple
        { r: 192, g: 132, b: 252 },  // Light purple
        { r: 147, g: 197, b: 253 },  // Sky blue
        { r: 196, g: 181, b: 253 },  // Lavender
      ]
      const c = colorPalette[index % colorPalette.length]
      this.color = `rgb(${c.r}, ${c.g}, ${c.b})`
      
      // MAXIMUM BRIGHTNESS - all rings visible
      this.opacity = 1.0 // Full opacity for maximum visibility
      
      // Line width varies (creates depth)
      this.width = 2.5 - (normalized * 1)
      
      // Breathing pulse effect
      this.pulsePhase = Math.random() * Math.PI * 2
      this.pulseSpeed = 0.001 + Math.random() * 0.002
    }

    update() {
      // Update all frequency phases for smooth animation
      for (let i = 0; i < this.complexityLayers; i++) {
        this.phases[i] += this.speeds[i]
      }
      this.pulsePhase += this.pulseSpeed
    }

    draw(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) {
      ctx.save()
      
      // Breathing pulse effect
      const pulse = Math.sin(this.pulsePhase) * 0.15 + 1
      const currentOpacity = this.opacity * pulse
      
      // Use 'screen' blend mode for additive glow (like light)
      ctx.globalCompositeOperation = 'screen'
      
      // High-quality anti-aliasing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Build color with alpha
      const rgbMatch = this.color.match(/\d+/g)
      if (!rgbMatch) return
      const [r, g, b] = rgbMatch.map(Number)
      
      // MASSIVE glow for visibility
      ctx.shadowBlur = 40
      ctx.shadowColor = this.color
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${currentOpacity})`
      ctx.lineWidth = this.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      ctx.beginPath()
      
      // Ultra-smooth circle with 360 points (one per degree)
      const points = 360
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2
        
        // Complex multi-frequency wave (creates organic, fluid motion)
        let totalWave = 0
        for (let j = 0; j < this.complexityLayers; j++) {
          const freq = this.frequencies[j]
          const phase = this.phases[j]
          const weight = 1 / (j + 1) // Higher frequencies have less impact
          
          // Multiple sine waves at different frequencies
          const wave = Math.sin(angle * freq + phase) * weight
          totalWave += wave
        }
        
        // Normalize and apply amplitude
        const normalizedWave = (totalWave / this.complexityLayers) * this.amplitude * pulse
        
        // Add subtle noise for natural variation
        const noise = (Math.sin(angle * 50 + time * 0.1) * 0.3)
        
        const finalRadius = this.baseRadius + normalizedWave + noise
        
        const x = centerX + Math.cos(angle) * finalRadius
        const y = centerY + Math.sin(angle) * finalRadius
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.closePath()
      ctx.stroke()
      
      // TRIPLE glow pass for MAXIMUM luminosity
      ctx.globalAlpha = 0.5
      ctx.shadowBlur = 50
      ctx.lineWidth = this.width * 3
      ctx.stroke()
      
      // Fourth pass for even more glow
      ctx.globalAlpha = 0.3
      ctx.shadowBlur = 60
      ctx.lineWidth = this.width * 4
      ctx.stroke()
      
      ctx.restore()
    }
  }

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // FULL CLEAR - no fade trail (keeps waves bright!)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    // Initialize waves once with perfect count (8 waves for depth)
    if (wavesRef.current.length === 0) {
      for (let i = 0; i < 8; i++) {
        wavesRef.current.push(new Wave(i, 8))
      }
    }
    
    // Update and draw all waves
    wavesRef.current.forEach(wave => {
      wave.update()
      wave.draw(ctx, centerX, centerY, timeRef.current)
    })
    
    timeRef.current += 1
    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = size
    canvas.height = size

    // DON'T fill with black - keep transparent!
    // Clear to transparent
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, size, size)
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 backdrop-blur-sm border-2 border-purple-400/30 flex items-center justify-center hover:bg-purple-500/20 hover:border-purple-400/50 transition-all duration-300 pointer-events-auto shadow-lg shadow-purple-500/20">
            <svg 
              className="w-10 h-10 text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
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
