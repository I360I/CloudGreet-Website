'use client'

import React, { useRef, useEffect, useState, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { Phone, Loader2 } from 'lucide-react'
import { logger } from '@/lib/monitoring'
import { useToast } from '@/app/contexts/ToastContext'
import { Button } from '@/app/components/ui/Button'

interface CallOrbProps {
  onCall: (phone: string) => Promise<void>
}

const CallOrb = memo(function CallOrb({ onCall }: CallOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phone, setPhone] = useState('')
  const [calling, setCalling] = useState(false)
  const [error, setError] = useState('')
  const { showError, showSuccess } = useToast()

  class RingWave {
    baseRadius: number
    amplitude: number
    frequency: number
    speed: number
    phase: number
    opacity: number
    width: number
    color: string

    constructor(index: number) {
      this.baseRadius = 80 + Math.random() * 20
      this.amplitude = Math.random() * 8 + 5
      this.frequency = Math.random() * 0.015 + 0.008
      this.speed = Math.random() * 0.4 + 0.2
      this.phase = Math.random() * Math.PI * 2
      this.opacity = Math.random() * 0.5 + 0.3
      this.width = Math.random() * 1.5 + 1
      const colors = ['rgba(139,92,246,1)', 'rgba(168,85,247,1)', 'rgba(192,132,252,1)']
      this.color = colors[Math.floor(Math.random() * colors.length)]
    }

    update() {
      this.phase += this.speed * 0.02
    }

    draw(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
      ctx.save()
      ctx.shadowBlur = 15
      ctx.shadowColor = this.color
      ctx.strokeStyle = this.color.replace('1)', `${this.opacity})`)
      ctx.lineWidth = this.width
      ctx.beginPath()

      for (let i = 0; i <= 120; i++) {
        const angle = (i / 120) * Math.PI * 2
        const wave = Math.sin((angle * 8 * this.frequency) + this.phase) * this.amplitude
        const radius = this.baseRadius + wave
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.closePath()
      ctx.stroke()
      ctx.restore()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return;
  const ctx = canvas.getContext('2d')
    if (!ctx) return;
  canvas.width = 300
    canvas.height = 300

    const waves: RingWave[] = []
    for (let i = 0; i < 5; i++) {
      waves.push(new RingWave(i))
    }

    let animationId: number
    const animate = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, 300, 300)

      waves.forEach(wave => {
        wave.update()
        wave.draw(ctx, 150, 150)
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animationId)
  }, [])

  const handleCall = useCallback(async () => {
    if (!phone || calling) return;
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) {
      const errorMessage = 'Please enter a valid 10-digit phone number'
      setError(errorMessage)
      showError('Invalid Phone Number', errorMessage)
      return
    }
    try {
      setCalling(true)
      setError('')
      await onCall(phone)
      showSuccess('Call Initiated!', 'You should receive a call shortly.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate call. Please try again.'
      setError(errorMessage)
      showError('Call Failed', errorMessage)
      logger.error('Call failed in CallOrb component', {
        error: errorMessage,
        phone: cleaned
      })
    } finally {
      setCalling(false)
    }
  }, [phone, calling, onCall, showError, showSuccess])

  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-8">
        <canvas ref={canvasRef} className="w-[300px] h-[300px]" style={{ filter: 'blur(0.5px)' }} />
        <motion.div className="absolute inset-0 flex items-center justify-center" whileHover={{ scale: 1.05 }}>
          <div className="w-20 h-20 rounded-full bg-purple-600/20 backdrop-blur-xl border border-purple-400/30 flex items-center justify-center">
            {calling ? <Loader2 className="w-10 h-10 text-purple-400 animate-spin" /> : <Phone className="w-10 h-10 text-purple-400" />}
          </div>
        </motion.div>
      </div>

      <div className="w-full max-w-sm">
        <label htmlFor="callOrbPhoneInput" className="sr-only">
          Phone number for test call
        </label>
        <input
          type="tel"
          id="callOrbPhoneInput"
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter phone number"
          disabled={calling}
          aria-label="Phone number for test call"
          aria-describedby={error ? "callOrbError" : "callOrbDescription"}
          aria-required="true"
          aria-invalid={!!error}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <p id="callOrbDescription" className="sr-only">
          Enter your 10-digit phone number to receive a test call
        </p>
        {error && (
          <p id="callOrbError" className="text-red-400 text-sm mt-2" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        
        <Button
          onClick={handleCall}
          disabled={calling || !phone}
          loading={calling}
          primaryColor="#9333EA"
          icon={!calling ? <Phone className="w-5 h-5" /> : undefined}
          iconPosition="left"
          fullWidth
          className="mt-4"
          aria-label={calling ? "Calling in progress" : "Initiate test call"}
          aria-busy={calling}
        >
          {calling ? 'Calling...' : 'Call Me Now'}
        </Button>
      </div>
    </div>
  )
})

CallOrb.displayName = 'CallOrb'

export default CallOrb

