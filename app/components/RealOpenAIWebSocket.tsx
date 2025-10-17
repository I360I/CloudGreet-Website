"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, Phone, CheckCircle, AlertTriangle } from 'lucide-react'

interface RealOpenAIWebSocketProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
}

export default function RealOpenAIWebSocket({
  businessName = 'CloudGreet',
  businessType = 'AI Voice Assistant',
  services = 'HVAC, Roofing, Painting',
  hours = 'Mon-Fri 8AM-6PM'
}: RealOpenAIWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  // Debug logging
  const addDebugInfo = useCallback((info: string) => {
    console.log('🔍 DEBUG:', info)
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${info}`])
  }, [])

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isListening) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const normalizedLevel = Math.min(average / 128, 1)

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
  }, [isListening])

  // Initialize audio system
  const initializeAudio = useCallback(async () => {
    try {
      addDebugInfo('Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      })

      addDebugInfo('Microphone access granted')
      streamRef.current = stream
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      addDebugInfo('Audio system initialized')

      return true
    } catch (error: any) {
      addDebugInfo(`Audio error: ${error.message}`)
      setError(`Audio access denied: ${error.message}`)
      return false
    }
  }, [addDebugInfo])

  // Connect directly to OpenAI Realtime API WebSocket
  const connectToOpenAI = useCallback(async () => {
    try {
      addDebugInfo('Getting authenticated WebSocket URL...')
      
      // Get authenticated WebSocket URL from server
      const response = await fetch('/api/voice/websocket-proxy')
      if (!response.ok) {
        throw new Error('Failed to get WebSocket URL')
      }
      
      const data = await response.json()
      const wsUrl = data.wsUrl
      addDebugInfo(`Connecting to: ${wsUrl.substring(0, 50)}...`)
      
      // Create WebSocket with authenticated URL
      wsRef.current = new WebSocket(wsUrl)
      
      wsRef.current.onopen = () => {
        addDebugInfo('✅ Connected to OpenAI Realtime API')
        console.log('✅ Connected to OpenAI Realtime API')
        
        // Send session configuration
        const sessionConfig = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: `You are a professional AI receptionist for ${businessName}, a ${businessType} company. We offer ${services} services. Our business hours are ${hours}. Be helpful, friendly, and professional. Keep responses concise and natural for voice conversation.`,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        }
        
        wsRef.current?.send(JSON.stringify(sessionConfig))
        addDebugInfo('Session configuration sent')
        setIsConnected(true)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📥 Received from OpenAI:', data)
          
          if (data.type === 'response.audio.delta') {
            // Handle audio response
            const audioData = data.delta
            if (audioData) {
              playAudioFromOpenAI(audioData)
            }
          } else if (data.type === 'response.text.delta') {
            // Handle text response
            setCurrentMessage(prev => prev + data.delta)
          } else if (data.type === 'response.done') {
            // Response complete
            addDebugInfo('AI response complete')
            setIsSpeaking(false)
          } else if (data.type === 'conversation.item.input_audio_buffer.committed') {
            // User audio was processed
            addDebugInfo('User audio processed')
            setIsListening(false)
          } else if (data.type === 'error') {
            addDebugInfo(`OpenAI error: ${data.error.message}`)
            setError(`OpenAI error: ${data.error.message}`)
          }
        } catch (e) {
          addDebugInfo(`Message parsing error: ${e}`)
        }
      }

      wsRef.current.onerror = (error) => {
        addDebugInfo(`WebSocket error: ${error}`)
        setError('Connection to OpenAI failed')
      }

      wsRef.current.onclose = () => {
        addDebugInfo('WebSocket connection closed')
        setIsConnected(false)
        setIsListening(false)
        setIsSpeaking(false)
      }

      return true
    } catch (error: any) {
      addDebugInfo(`Connection error: ${error.message}`)
      setError(`Connection failed: ${error.message}`)
      return false
    }
  }, [businessName, businessType, services, hours, addDebugInfo])

  // Play audio from OpenAI
  const playAudioFromOpenAI = useCallback(async (audioData: string) => {
    if (!audioContextRef.current) return

    try {
      // Decode base64 audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(
        Uint8Array.from(atob(audioData), c => c.charCodeAt(0)).buffer
      )
      
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start()

      addDebugInfo('Playing OpenAI audio')
      setIsSpeaking(true)
    } catch (error) {
      addDebugInfo(`Audio playback error: ${error}`)
    }
  }, [addDebugInfo])

  // Send audio to OpenAI
  const sendAudioToOpenAI = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: "input_audio_buffer.append",
        audio: Array.from(new Uint8Array(audioData))
      }
      wsRef.current.send(JSON.stringify(message))
      addDebugInfo('Audio sent to OpenAI')
    }
  }, [addDebugInfo])

  // Setup audio recording
  const setupAudioRecording = useCallback(() => {
    if (!streamRef.current || !audioContextRef.current) return

    const source = audioContextRef.current.createMediaStreamSource(streamRef.current)
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor
    
    processor.onaudioprocess = (event) => {
      if (isListening && wsRef.current?.readyState === WebSocket.OPEN) {
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        
        // Convert to PCM16
        const pcm16 = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
        }
        
        sendAudioToOpenAI(pcm16.buffer)
      }
    }
    
    source.connect(processor)
    processor.connect(audioContextRef.current.destination)
    
    addDebugInfo('Audio recording setup complete')
  }, [isListening, sendAudioToOpenAI, addDebugInfo])

  // Connect to voice system
  const connect = useCallback(async () => {
    try {
      setError(null)
      setDebugInfo([])
      addDebugInfo('Starting REAL OpenAI Realtime API connection...')
      console.log('🚀 Connecting to OpenAI Realtime API...')

      // Initialize audio
      const audioReady = await initializeAudio()
      if (!audioReady) return

      // Connect to OpenAI
      const openaiReady = await connectToOpenAI()
      if (!openaiReady) return

      addDebugInfo('OpenAI Realtime API connected successfully')
      console.log('✅ OpenAI Realtime API ready')

      // Setup audio recording
      setupAudioRecording()

    } catch (error: any) {
      addDebugInfo(`Connection error: ${error.message}`)
      console.error('Connection error:', error)
      setError(error.message)
    }
  }, [initializeAudio, connectToOpenAI, setupAudioRecording, addDebugInfo])

  // Start listening
  const startListening = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsListening(true)
      addDebugInfo('Started listening for speech')
      monitorAudioLevel()
      
      // Send start listening message
      const message = {
        type: "conversation.item.input_audio_buffer.speech_started"
      }
      wsRef.current.send(JSON.stringify(message))
    }
  }, [monitorAudioLevel, addDebugInfo])

  // Stop listening
  const stopListening = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsListening(false)
      addDebugInfo('Stopped listening')
      
      // Send stop listening message
      const message = {
        type: "conversation.item.input_audio_buffer.speech_stopped"
      }
      wsRef.current.send(JSON.stringify(message))
    }
  }, [addDebugInfo])

  // Disconnect from voice system
  const disconnect = useCallback(() => {
    addDebugInfo('Disconnecting from OpenAI Realtime API...')
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setCurrentMessage('')
    setError(null)
    addDebugInfo('Disconnected from OpenAI Realtime API')
  }, [addDebugInfo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Get orb state
  const getOrbState = () => {
    if (error) return 'error'
    if (isSpeaking) return 'speaking'
    if (isListening) return 'listening'
    if (isConnected) return 'connected'
    return 'idle'
  }

  const orbState = getOrbState()

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-screen bg-black">
      {/* Real OpenAI WebSocket Voice Orb */}
      <div className="relative mb-8">
        <motion.button
          onClick={isConnected ? (isListening ? stopListening : startListening) : connect}
          disabled={!process.env.NEXT_PUBLIC_OPENAI_API_KEY}
          className="relative w-96 h-96 rounded-full overflow-hidden focus:outline-none focus:ring-4 focus:ring-purple-300/50 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          animate={{
            scale: isSpeaking ? [1, 1.05, 1] : 1,
          }}
          transition={{
            scale: { duration: 0.8, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }
          }}
        >
          {/* Clean black background */}
          <div className="absolute inset-0 rounded-full bg-black border-2 border-gray-800" />

          {/* Purple glowing lines when active */}
          <AnimatePresence>
            {(orbState === 'listening' || orbState === 'speaking') && (
              <>
                {/* Outer ring */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: [0.2, 0.8, 0.2],
                    scale: [0.8, 1.4, 0.8],
                    rotate: [0, 360]
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "linear",
                    opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute inset-4 rounded-full border border-purple-400/60"
                  style={{
                    boxShadow: `0 0 20px rgba(147, 51, 234, 0.4)`
                  }}
                />
                
                {/* Middle ring */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ 
                    opacity: [0.3, 0.7, 0.3],
                    scale: [0.9, 1.3, 0.9],
                    rotate: [360, 0]
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    duration: 2.5, 
                    repeat: Infinity, 
                    ease: "linear",
                    opacity: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute inset-8 rounded-full border border-purple-500/50"
                  style={{
                    boxShadow: `0 0 15px rgba(147, 51, 234, 0.5)`
                  }}
                />
                
                {/* Inner ring */}
                <motion.div
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{ 
                    opacity: [0.4, 0.8, 0.4],
                    scale: [1, 1.2, 1],
                    rotate: [0, -360]
                  }}
                  exit={{ opacity: 0, scale: 1 }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "linear",
                    opacity: { duration: 1, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute inset-12 rounded-full border border-purple-300/70"
                  style={{
                    boxShadow: `0 0 10px rgba(147, 51, 234, 0.6)`
                  }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {orbState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="relative w-32 h-32 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center"
                >
                  <Phone className="w-12 h-12 text-gray-300" />
                </motion.div>
              )}
              
              {orbState === 'listening' && (
                <motion.div
                  key="listening"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: 1,
                    boxShadow: `0 0 20px rgba(147, 51, 234, 0.4)`
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="relative w-32 h-32 rounded-full bg-purple-900/60 border border-purple-400/60 flex items-center justify-center"
                  style={{
                    boxShadow: `inset 0 0 20px rgba(147, 51, 234, 0.3), 0 0 30px rgba(147, 51, 234, 0.5)`
                  }}
                >
                  <Mic className="w-12 h-12 text-purple-200" />
                </motion.div>
              )}
              
              {orbState === 'speaking' && (
                <motion.div
                  key="speaking"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: 1,
                    rotate: [0, 5, -5, 0]
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="relative w-32 h-32 rounded-full bg-purple-800/60 border border-purple-400/60 flex items-center justify-center"
                  style={{
                    boxShadow: `inset 0 0 20px rgba(147, 51, 234, 0.4), 0 0 40px rgba(147, 51, 234, 0.6)`
                  }}
                >
                  <Volume2 className="w-12 h-12 text-purple-200" />
                </motion.div>
              )}
              
              {orbState === 'connected' && (
                <motion.div
                  key="connected"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.05, 1],
                    boxShadow: `0 0 25px rgba(34, 197, 94, 0.4)`
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-32 h-32 rounded-full bg-green-900/60 border border-green-400/60 flex items-center justify-center"
                  style={{
                    boxShadow: 'inset 0 0 20px rgba(34, 197, 94, 0.3), 0 0 30px rgba(34, 197, 94, 0.4)'
                  }}
                >
                  <CheckCircle className="w-12 h-12 text-green-200" />
                </motion.div>
              )}
              
              {orbState === 'error' && (
                <motion.div
                  key="error"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="relative w-32 h-32 rounded-full bg-red-900/60 border border-red-400/60 flex items-center justify-center"
                  style={{
                    boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.3), 0 0 30px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <AlertTriangle className="w-12 h-12 text-red-200" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.button>
      </div>

      {/* Status Display */}
      <div className="text-center mb-6">
        <AnimatePresence mode="wait">
          {orbState === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-white">
                Connect to OpenAI Realtime
              </h2>
              <p className="text-gray-400">Click to start REAL AI conversation</p>
            </motion.div>
          )}
          
          {orbState === 'listening' && (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-purple-400">
                Listening...
              </h2>
              <p className="text-gray-400">Speak clearly - OpenAI is processing</p>
            </motion.div>
          )}
          
          {orbState === 'speaking' && (
            <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-purple-400">
                AI Speaking
              </h2>
              <p className="text-gray-400">OpenAI is responding</p>
            </motion.div>
          )}
          
          {orbState === 'connected' && (
            <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-green-400">
                OpenAI Connected
              </h2>
              <p className="text-gray-400">Click to start listening - SPEAK NOW!</p>
            </motion.div>
          )}
          
          {orbState === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-red-400">
                Connection Error
              </h2>
              <p className="text-gray-400">Please try again</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Message Display */}
      {currentMessage && (
        <motion.div
          className="max-w-lg mx-auto mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-black/40 backdrop-blur-sm border border-purple-400/20 rounded-xl p-4">
            <p className="text-white text-lg">{currentMessage}</p>
          </div>
        </motion.div>
      )}

      {/* Debug Info */}
      {debugInfo.length > 0 && (
        <motion.div
          className="max-w-lg mx-auto mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-gray-900/40 backdrop-blur-sm border border-gray-400/20 rounded-xl p-4">
            <h3 className="text-white text-sm font-bold mb-2">OpenAI Realtime Debug:</h3>
            {debugInfo.map((info, index) => (
              <p key={index} className="text-gray-300 text-xs">{info}</p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          className="max-w-md mx-auto mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
