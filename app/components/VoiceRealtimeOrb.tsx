"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Sparkles, Settings, AlertCircle } from 'lucide-react'

interface VoiceRealtimeOrbProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
}

export default function VoiceRealtimeOrb({ 
  businessName = 'CloudGreet', 
  businessType = 'AI Receptionist Service',
  services = 'AI phone answering, appointment scheduling',
  hours = '24/7'
}: VoiceRealtimeOrbProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioQueueRef = useRef<Int16Array[]>([])
  const isPlayingRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      checkMicrophonePermission()
      drawWaves()
    }

    return () => {
      cleanup()
    }
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setMicPermission(result.state as any)
      result.onchange = () => setMicPermission(result.state as any)
    } catch (e) {
      setMicPermission('prompt')
    }
  }

  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000
        }
      })
      mediaStreamRef.current = stream
      setMicPermission('granted')
      return stream
    } catch (error) {
      setMicPermission('denied')
      setError('Microphone access denied. Please allow microphone in browser settings.')
      return null
    }
  }

  const connectToOpenAI = async () => {
    try {
      if (micPermission !== 'granted') {
        const stream = await requestMicAccess()
        if (!stream) return
      }

      setError(null)

      // Connect to OpenAI Realtime API
      console.log('🚀 Connecting to OpenAI Realtime API...')
      
      // Get ephemeral session token from backend (SECURE)
      const sessionRes = await fetch('/api/ai/realtime-token', {
        method: 'POST'
      })
      
      if (!sessionRes.ok) {
        const errorData = await sessionRes.json()
        throw new Error(errorData.error || 'Failed to create session')
      }
      
      const { clientSecret, sessionId } = await sessionRes.json()
      console.log(`✅ Got ephemeral token for session: ${sessionId}`)

      // Connect with ephemeral token (secure, expires after session)
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
        ['realtime', `openai-insecure-api-key.${clientSecret}`]
      )

      ws.onopen = () => {
        console.log('✅ Connected to OpenAI Realtime')
        setIsConnected(true)
        
        // Send session configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are a professional AI receptionist for ${businessName}, a ${businessType}.

Services: ${services}
Hours: ${hours}

Be warm, professional, and helpful. Keep responses brief (20-30 words). 
Answer questions about services, hours, and pricing clearly.
Help schedule appointments if asked.
Be conversational and natural - you're having a phone conversation.`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            temperature: 0.8,
            max_response_output_tokens: 150
          }
        }))

        // Start audio streaming
        startAudioStreaming(ws)
      }

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'conversation.item.input_audio_transcription.completed':
            setTranscript(data.transcript)
            console.log('You:', data.transcript)
            break
            
          case 'response.audio.delta':
            // Received audio chunk from AI
            const audioData = base64ToArrayBuffer(data.delta)
            audioQueueRef.current.push(new Int16Array(audioData))
            if (!isPlayingRef.current) {
              playAudioQueue()
            }
            break
            
          case 'response.audio_transcript.delta':
            // AI's text response (for display)
            console.log('AI:', data.delta)
            break
            
          case 'response.done':
            console.log('✅ Response complete')
            break
            
          case 'input_audio_buffer.speech_started':
            setIsListening(true)
            console.log('🎤 Speech detected')
            break
            
          case 'input_audio_buffer.speech_stopped':
            setIsListening(false)
            console.log('🛑 Speech ended')
            break
            
          case 'response.audio.start':
            setIsSpeaking(true)
            break
            
          case 'response.audio.done':
            setIsSpeaking(false)
            break
            
          case 'error':
            console.error('Realtime API error:', data.error)
            setError(data.error.message)
            break
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error. Please try again.')
      }

      ws.onclose = () => {
        console.log('❌ Disconnected')
        setIsConnected(false)
        setIsListening(false)
        setIsSpeaking(false)
      }

      wsRef.current = ws

    } catch (error: any) {
      console.error('❌ Realtime API connection failed:', error)
      setError('Connection failed: ' + error.message + '. Please check your API key and network connection.')
      setIsConnected(false)
    }
  }

  const startAudioStreaming = async (ws: WebSocket) => {
    if (!mediaStreamRef.current) {
      const stream = await requestMicAccess()
      if (!stream) return
    }

    const audioContext = audioContextRef.current!
    const source = audioContext.createMediaStreamSource(mediaStreamRef.current!)
    const processor = audioContext.createScriptProcessor(2048, 1, 1)

    source.connect(processor)
      processor.connect(audioContext.destination)

    processor.onaudioprocess = (e) => {
      if (!isConnected) return
      
      const inputData = e.inputBuffer.getChannelData(0)
      const pcm16 = float32ToPCM16(inputData)
      
      // Send audio to OpenAI
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: arrayBufferToBase64(pcm16.buffer as ArrayBuffer)
      }))
    }
  }

  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return
    
    isPlayingRef.current = true

    while (audioQueueRef.current.length > 0) {
      const chunk = audioQueueRef.current.shift()!
      await playPCM16(chunk)
    }

    isPlayingRef.current = false
  }

  const playPCM16 = async (pcm16: Int16Array) => {
    const audioContext = audioContextRef.current!
    const audioBuffer = audioContext.createBuffer(1, pcm16.length, 24000)
    const channelData = audioBuffer.getChannelData(0)
    
    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 32768.0
    }

    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext.destination)
    source.start()

    return new Promise(resolve => {
      source.onended = resolve
    })
  }

  const cleanup = () => {
    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }

  const drawWaves = () => {
    // Wave visualization (same as before)
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const baseRadius = 120
    let time = 0

    const purpleColors = ['#8B5CF6', '#A855F7', '#9333EA', '#C084FC', '#A78BFA']

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'screen'

      const numWaves = 8
      for (let i = 0; i < numWaves; i++) {
        const color = purpleColors[i % purpleColors.length]
        const radiusOffset = i * 12
        const phaseOffset = (i / numWaves) * Math.PI * 2
        const amplitude = 15 + (i * 2) + (isSpeaking || isListening ? audioLevel * 25 : 0)

        ctx.beginPath()
        
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
          const baseWave = Math.sin((angle * 15) + time + phaseOffset) * amplitude
          const secondaryWave = Math.sin((angle * 22.5) + time * 1.2 + phaseOffset) * amplitude * 0.2
          
          const radius = baseRadius + radiusOffset + baseWave + secondaryWave
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          
          if (angle === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        
        ctx.closePath()
        
        const opacity = 0.5 - (i * 0.04)
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius - 30, centerX, centerY, baseRadius + radiusOffset + 60)
        gradient.addColorStop(0, `${color}00`)
        gradient.addColorStop(0.3, `${color}${Math.floor(opacity * 0.3 * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(0.6, `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(1, `${color}00`)
        
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2.5
        ctx.shadowColor = color
        ctx.shadowBlur = 20
        ctx.stroke()
      }

      time += 0.008
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()
  }

  // Utility functions
  const float32ToPCM16 = (float32: Float32Array): Int16Array => {
    const pcm16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return pcm16
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  return (
    <div className="relative w-full">
      {/* Mic Permission Banner */}
      {micPermission === 'denied' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-yellow-500/10 border-2 border-yellow-500/40 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 font-semibold text-sm mb-1">Microphone Required</p>
            <p className="text-yellow-300 text-xs">
              Click the 🔒 icon → Site settings → Allow Microphone
            </p>
          </div>
        </motion.div>
      )}

      {/* Canvas for waves */}
      <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          className="absolute max-w-full max-h-full"
        />

        {/* Dark Orb */}
        <motion.div
          className="relative z-10 w-48 h-48 cursor-pointer overflow-hidden"
          style={{
            borderRadius: '47% 53% 52% 48% / 51% 49% 51% 49%',
            background: 'radial-gradient(ellipse at 35% 35%, rgba(30,25,45,0.8), rgba(0,0,0,1) 60%, rgba(0,0,0,1))',
            backdropFilter: 'blur(20px)'
          }}
          onClick={() => {
            if (!isConnected) {
              connectToOpenAI()
            } else {
              cleanup()
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              '0 0 40px rgba(139, 92, 246, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.9)',
              '0 0 60px rgba(139, 92, 246, 0.6), inset 0 0 40px rgba(0, 0, 0, 0.9)',
              '0 0 40px rgba(139, 92, 246, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.9)',
            ],
            borderRadius: [
              '47% 53% 52% 48% / 51% 49% 51% 49%',
              '50% 50% 48% 52% / 49% 51% 49% 51%',
              '47% 53% 52% 48% / 51% 49% 51% 49%',
            ]
          }}
          transition={{ 
            boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            borderRadius: { duration: 8, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* Noise texture */}
          <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
              backgroundSize: 'cover'
            }}
          />
          
          <div className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-950/20 via-black to-black" />
          
          {(isListening || isSpeaking) && (
            <motion.div
              animate={{ opacity: [0.1, 0.3, 0.1], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-purple-600/20 blur-xl"
            />
          )}

          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!isConnected ? (
                <motion.div key="start" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Mic className="w-8 h-8 text-white/60" />
                </motion.div>
              ) : isSpeaking ? (
                <motion.div key="speaking" initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1], opacity: 0.6 }} exit={{ scale: 0 }} transition={{ scale: { duration: 1, repeat: Infinity } }}>
                  <Volume2 className="w-8 h-8 text-purple-400/60" />
                </motion.div>
              ) : isListening ? (
                <motion.div key="listening" initial={{ scale: 0 }} animate={{ scale: 1, opacity: 0.6 }} exit={{ scale: 0 }}>
                  <Mic className="w-8 h-8 text-blue-400/60" />
                </motion.div>
              ) : (
                <motion.div key="ready" initial={{ scale: 0 }} animate={{ scale: 1, opacity: 0.4 }} exit={{ scale: 0 }}>
                  <MicOff className="w-6 h-6 text-gray-500/60" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Status */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-8">
        <AnimatePresence mode="wait">
          {!isConnected ? (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Click to Start
              </h3>
              <p className="text-gray-400 text-base">Real-time voice AI • Instant responses</p>
            </motion.div>
          ) : isListening ? (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl font-bold mb-3 text-blue-400">Listening...</h3>
              {transcript && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg max-w-md mx-auto">
                  <p className="text-white text-sm">"{transcript}"</p>
                </div>
              )}
            </motion.div>
          ) : isSpeaking ? (
            <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Speaking
              </h3>
              <p className="text-gray-400 text-sm">Real-time response</p>
            </motion.div>
          ) : (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl font-bold mb-3 text-white">Connected</h3>
              <p className="text-gray-400 text-base">Start speaking anytime</p>
              <p className="text-xs text-gray-500 mt-2">Click orb to disconnect</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center max-w-md mx-auto">
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      {isConnected && !error && (
        <div className="text-center mt-4">
          <p className="text-xs text-green-400 font-medium">
            ✓ OpenAI Realtime • 300-600ms latency
          </p>
        </div>
      )}
    </div>
  )
}

