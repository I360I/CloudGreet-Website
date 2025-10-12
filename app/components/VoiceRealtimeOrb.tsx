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
  const [visualIntensity, setVisualIntensity] = useState(0)
  
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioQueueRef = useRef<Int16Array[]>([])
  const isPlayingRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)

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
      
      // Set up audio analyzer for visualizations
      if (audioContextRef.current) {
        const analyzer = audioContextRef.current.createAnalyser()
        analyzer.fftSize = 256
        const source = audioContextRef.current.createMediaStreamSource(stream)
        source.connect(analyzer)
        analyzerRef.current = analyzer
        
        // Start monitoring audio levels
        monitorAudioLevel()
      }
      
      return stream
    } catch (error) {
      setMicPermission('denied')
      setError('Microphone access denied. Please allow microphone in browser settings.')
      return null
    }
  }

  const monitorAudioLevel = () => {
    if (!analyzerRef.current) return
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount)
    
    const checkLevel = () => {
      if (!analyzerRef.current) return
      
      analyzerRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      const normalizedLevel = Math.min(average / 128, 1)
      
      setAudioLevel(normalizedLevel)
      setVisualIntensity(normalizedLevel * 2) // Amplify for visuals
      
      animationFrameRef.current = requestAnimationFrame(checkLevel)
    }
    
    checkLevel()
  }

  const connectToOpenAI = async () => {
    try {
      if (micPermission !== 'granted') {
        const stream = await requestMicAccess()
        if (!stream) return
      }

      setError(null)

      // Connect to OpenAI Realtime API
      // Get ephemeral session token from backend (SECURE)
      const sessionRes = await fetch('/api/ai/realtime-session', {
        method: 'POST'
      })
      
      if (!sessionRes.ok) {
        const errorData = await sessionRes.json()
        throw new Error(errorData.error || 'Failed to create session')
      }
      
      const { clientSecret, sessionId } = await sessionRes.json()

      // Connect with ephemeral token using GA endpoint
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        ['realtime', `openai-insecure-api-key.${clientSecret}`]
      )

      ws.onopen = () => {
        setIsConnected(true)
        
        // Send minimal session configuration
        // Start with bare minimum, only add what's actually supported
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime'
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
            break
            
          case 'response.done':
            break
            
          case 'input_audio_buffer.speech_started':
            setIsListening(true)
            break
            
          case 'input_audio_buffer.speech_stopped':
            setIsListening(false)
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
    // NOTE: createScriptProcessor is deprecated but still widely supported
    // TODO: Migrate to AudioWorklet when we have time to properly implement it
    const processor = audioContext.createScriptProcessor(2048, 1, 1)

    source.connect(processor)
    processor.connect(audioContext.destination)

    processor.onaudioprocess = (e) => {
      if (!isConnected || ws.readyState !== WebSocket.OPEN) return
      
      const inputData = e.inputBuffer.getChannelData(0)
      const pcm16 = float32ToPCM16(inputData)
      
      // Send audio to OpenAI Realtime API
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
    setAudioLevel(0)
    setVisualIntensity(0)
    
    // Cancel all animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    // Clear analyzer
    analyzerRef.current = null
    
    // Note: Keep audioContext alive for reconnection
    // Only close on unmount
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

        {/* Premium Voice Orb */}
        <motion.div
          className="relative z-10 w-80 h-80 cursor-pointer overflow-hidden"
          style={{
            borderRadius: '50%',
            background: isListening 
              ? 'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.6), rgba(37, 99, 235, 0.4) 40%, rgba(29, 78, 216, 0.2) 70%, rgba(0, 0, 0, 0.95))'
              : isSpeaking
              ? 'radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.6), rgba(126, 34, 206, 0.4) 40%, rgba(107, 33, 168, 0.2) 70%, rgba(0, 0, 0, 0.95))'
              : 'radial-gradient(circle at 30% 30%, rgba(88, 28, 135, 0.3), rgba(59, 7, 100, 0.2) 50%, rgba(0, 0, 0, 0.95))',
            backdropFilter: 'blur(30px)',
            border: isListening || isSpeaking ? '2px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)'
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
            scale: isListening || isSpeaking ? 1 + (visualIntensity * 0.15) : 1,
            boxShadow: isListening 
              ? [
                  `0 0 ${60 + visualIntensity * 40}px rgba(59, 130, 246, ${0.6 + visualIntensity * 0.3}), inset 0 0 40px rgba(0, 0, 0, 0.9)`,
                  `0 0 ${80 + visualIntensity * 60}px rgba(59, 130, 246, ${0.8 + visualIntensity * 0.2}), inset 0 0 50px rgba(0, 0, 0, 0.9)`,
                  `0 0 ${60 + visualIntensity * 40}px rgba(59, 130, 246, ${0.6 + visualIntensity * 0.3}), inset 0 0 40px rgba(0, 0, 0, 0.9)`,
                ]
              : isSpeaking
              ? [
                  `0 0 ${60 + visualIntensity * 40}px rgba(147, 51, 234, ${0.6 + visualIntensity * 0.3}), inset 0 0 40px rgba(0, 0, 0, 0.9)`,
                  `0 0 ${80 + visualIntensity * 60}px rgba(147, 51, 234, ${0.8 + visualIntensity * 0.2}), inset 0 0 50px rgba(0, 0, 0, 0.9)`,
                  `0 0 ${60 + visualIntensity * 40}px rgba(147, 51, 234, ${0.6 + visualIntensity * 0.3}), inset 0 0 40px rgba(0, 0, 0, 0.9)`,
                ]
              : [
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
            scale: { duration: 0.2 },
            boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
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
          
          {/* Inner glow layer */}
          <div className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-950/20 via-black to-black" />
          
          {/* Premium Voice-Reactive Glow Rings */}
          {isListening && (
            <>
              {/* Inner glow */}
              <motion.div
                animate={{ 
                  opacity: [0.4, 0.7, 0.4],
                  scale: [0.9, 1 + visualIntensity * 0.2, 0.9]
                }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="absolute inset-12 rounded-full bg-gradient-to-br from-blue-400/60 via-cyan-500/50 to-blue-600/40 blur-2xl"
              />
              {/* Middle ring */}
              <motion.div
                animate={{ 
                  opacity: [0.3, 0.5, 0.3],
                  scale: [1, 1.15 + visualIntensity * 0.3, 1]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-500/40 via-blue-600/30 to-cyan-400/20 blur-3xl"
              />
              {/* Outer halo */}
              <motion.div
                animate={{ 
                  opacity: [0.2, 0.4, 0.2],
                  scale: [1.05, 1.25 + visualIntensity * 0.4, 1.05]
                }}
                transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/30 via-cyan-500/20 to-transparent blur-[40px]"
              />
            </>
          )}
          
          {isSpeaking && (
            <>
              {/* Inner glow */}
              <motion.div
                animate={{ 
                  opacity: [0.5, 0.8, 0.5],
                  scale: [0.9, 1.1 + visualIntensity * 0.3, 0.9]
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-400/70 via-fuchsia-500/60 to-purple-600/50 blur-2xl"
              />
              {/* Middle ring */}
              <motion.div
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.2 + visualIntensity * 0.4, 1]
                }}
                transition={{ duration: 1.3, repeat: Infinity, delay: 0.15 }}
                className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-500/50 via-pink-500/40 to-fuchsia-400/30 blur-3xl"
              />
              {/* Outer halo */}
              <motion.div
                animate={{ 
                  opacity: [0.2, 0.5, 0.2],
                  scale: [1.05, 1.3 + visualIntensity * 0.5, 1.05]
                }}
                transition={{ duration: 1.6, repeat: Infinity, delay: 0.3 }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/40 via-pink-500/30 to-fuchsia-600/20 blur-[50px]"
              />
            </>
          )}

          {/* Premium Icon with Glass Morphism */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!isConnected ? (
                <motion.div 
                  key="start" 
                  initial={{ scale: 0, rotate: -180 }} 
                  animate={{ scale: 1, rotate: 0 }} 
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", duration: 0.7 }}
                  className="bg-gradient-to-br from-white/20 to-white/5 rounded-full p-8 backdrop-blur-xl border border-white/20 shadow-2xl"
                >
                  <Mic className="w-16 h-16 text-white drop-shadow-lg" />
                </motion.div>
              ) : isSpeaking ? (
                <motion.div 
                  key="speaking" 
                  initial={{ scale: 0 }} 
                  animate={{ 
                    scale: [1, 1.08 + visualIntensity * 0.15, 1],
                    rotate: [0, 5, -5, 0]
                  }} 
                  exit={{ scale: 0 }} 
                  transition={{ 
                    scale: { duration: 0.6, repeat: Infinity },
                    rotate: { duration: 2, repeat: Infinity }
                  }}
                  className="bg-gradient-to-br from-purple-500/30 to-fuchsia-600/20 rounded-full p-8 backdrop-blur-xl border-2 border-purple-400/50 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
                >
                  <Volume2 className="w-16 h-16 text-purple-200 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                </motion.div>
              ) : isListening ? (
                <motion.div 
                  key="listening" 
                  initial={{ scale: 0 }} 
                  animate={{ 
                    scale: 1 + visualIntensity * 0.25,
                    opacity: 0.85 + visualIntensity * 0.15
                  }} 
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.1 }}
                  className="bg-gradient-to-br from-blue-500/30 to-cyan-600/20 rounded-full p-8 backdrop-blur-xl border-2 border-blue-400/60 shadow-[0_0_40px_rgba(59,130,246,0.5)]"
                >
                  <Mic className="w-16 h-16 text-blue-200 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                </motion.div>
              ) : (
                <motion.div 
                  key="ready" 
                  initial={{ scale: 0 }} 
                  animate={{ 
                    scale: 1,
                    rotate: [0, 360]
                  }} 
                  exit={{ scale: 0 }}
                  transition={{
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                  }}
                  className="bg-gradient-to-br from-white/10 to-purple-500/10 rounded-full p-8 backdrop-blur-xl border border-white/10 shadow-xl"
                >
                  <Sparkles className="w-14 h-14 text-purple-300/80 drop-shadow-lg" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Premium Audio Level Visualizer */}
          {isListening && visualIntensity > 0.05 && (
            <div className="absolute inset-0 flex items-center justify-center gap-3 pointer-events-none">
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: [30, 30 + visualIntensity * 100 * (1 - Math.abs(i - 3) * 0.2), 30],
                    opacity: [0.5, 0.9, 0.5]
                  }}
                  transition={{
                    duration: 0.4,
                    repeat: Infinity,
                    delay: i * 0.08,
                    ease: "easeInOut"
                  }}
                  className="w-2 bg-gradient-to-t from-blue-500 via-cyan-400 to-blue-300 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                  style={{
                    height: 30 + visualIntensity * 80 * (1 - Math.abs(i - 3) * 0.2)
                  }}
                />
              ))}
            </div>
          )}
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

