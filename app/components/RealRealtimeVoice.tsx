"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'

interface RealRealtimeVoiceProps {
  businessName: string
  businessType: string
  services: string
  hours: string
}

const RealRealtimeVoice: React.FC<RealRealtimeVoiceProps> = ({
  businessName,
  businessType,
  services,
  hours,
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [status, setStatus] = useState('Click to connect')
  const [error, setError] = useState<string | null>(null)
  const [currentMessage, setCurrentMessage] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingAudioRef = useRef(false)

  // Initialize audio context and microphone
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎤 Initializing realtime audio...')
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser')
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          } 
        })
        mediaStreamRef.current = stream
        console.log('✅ Microphone permission granted')
      } catch (permissionError: any) {
        console.error('❌ Microphone permission denied:', permissionError)
        if (permissionError.name === 'NotAllowedError') {
          throw new Error('Microphone permission denied. Please allow microphone access and try again.')
        } else if (permissionError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.')
        } else {
          throw new Error(`Microphone error: ${permissionError.message}`)
        }
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      
      scriptProcessorRef.current.onaudioprocess = (event) => {
        if (isListening && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0)
          // Convert Float32Array to Int16Array (PCM16) for realtime streaming
          const pcm16 = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF
          }
          
          // Send raw PCM16 data directly to OpenAI Realtime API
          wsRef.current.send(pcm16)
        }
      }

      source.connect(scriptProcessorRef.current)
      scriptProcessorRef.current.connect(audioContextRef.current.destination)

      console.log('✅ Realtime audio initialized')
      return true
    } catch (err: any) {
      console.error('❌ Audio initialization failed:', err)
      setError(`Audio error: ${err.message}`)
      return false
    }
  }, [isListening])

  // Play audio response from OpenAI
  const playAudioResponse = useCallback(async (audioBase64: string) => {
    if (!audioContextRef.current) return

    try {
      const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0)).buffer
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData)
      
      audioQueueRef.current.push(new Float32Array(audioBuffer.getChannelData(0)))

      if (!isPlayingAudioRef.current) {
        processAudioQueue()
      }
    } catch (error) {
      console.error('❌ Error playing audio:', error)
    }
  }, [])

  const processAudioQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0 || isPlayingAudioRef.current) {
      isPlayingAudioRef.current = false
      setIsSpeaking(false)
      return
    }

    isPlayingAudioRef.current = true
    setIsSpeaking(true)
    const audioData = audioQueueRef.current.shift()!

    if (!audioContextRef.current) {
      isPlayingAudioRef.current = false
      setIsSpeaking(false)
      return
    }

    try {
      const buffer = audioContextRef.current.createBuffer(1, audioData.length, audioContextRef.current.sampleRate)
      const channelData = buffer.getChannelData(0)
      channelData.set(audioData)
      const source = audioContextRef.current.createBufferSource()
      source.buffer = buffer
      source.connect(audioContextRef.current.destination)
      source.onended = () => {
        isPlayingAudioRef.current = false
        processAudioQueue()
      }
      source.start(0)
    } catch (error) {
      console.error('❌ Error playing audio:', error)
      isPlayingAudioRef.current = false
      processAudioQueue()
    }
  }, [])

  // Connect to our server proxy (which handles OpenAI authentication)
  const connect = useCallback(async () => {
    try {
      console.log('🚀 Starting REAL realtime voice system...')
      setIsInitializing(true)
      setError(null)

      // Initialize audio first
      const audioReady = await initializeAudio()
      if (!audioReady) {
        throw new Error('Audio initialization failed')
      }

      // Create OpenAI session via our API
      const response = await fetch('/api/voice/realtime-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'create_session',
          businessName
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      const data = await response.json()
      sessionIdRef.current = data.sessionId
      
      console.log('✅ Session created:', data.sessionId)
      
      // Connect to our server proxy WebSocket (not directly to OpenAI)
      const wsUrl = `wss://cloudgreet.com/api/voice/realtime-proxy?sessionId=${data.sessionId}`
      console.log('🔌 Connecting to server proxy...')
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Connected to server proxy')
        
        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are a professional AI receptionist for ${businessName}. Be helpful, friendly, and professional. When the user connects, immediately greet them warmly and ask how you can help. Keep responses concise and natural for voice conversation.`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            }
          }
        }
        
        ws.send(JSON.stringify(sessionConfig))
        console.log('🔐 Sent session configuration')
        
        setIsConnected(true)
        setIsInitializing(false)
        setStatus('Connected - AI will greet you')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 Received from OpenAI:', data.type)

          if (data.type === 'response.audio.delta') {
            // Handle realtime audio response
            if (data.delta) {
              playAudioResponse(data.delta)
              console.log('🔊 Playing realtime audio response')
            }
          } else if (data.type === 'response.text.delta') {
            // Handle realtime text response
            setCurrentMessage(prev => prev + (data.delta || ''))
            console.log('📝 Realtime text response:', data.delta)
          } else if (data.type === 'response.done') {
            // Response complete
            setIsSpeaking(false)
            setCurrentMessage('')
            console.log('✅ Realtime response complete')
          } else if (data.type === 'error') {
            console.error('❌ OpenAI error:', data.error)
            setError(data.error?.message || 'OpenAI error')
            setIsInitializing(false)
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setError('Connection error with server proxy')
        setIsInitializing(false)
      }

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed', event.code, event.reason)
        setIsConnected(false)
        setIsListening(false)
        setIsSpeaking(false)
        setIsInitializing(false)
        if (event.code !== 1000) {
          setError(`Connection closed: ${event.reason || event.code}`)
        }
      }
    } catch (err: any) {
      console.error('❌ Connection failed:', err)
      setError(`Connection failed: ${err.message}`)
      setIsInitializing(false)
    }
  }, [initializeAudio, businessName, playAudioResponse])

  // Start listening
  const startListening = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to server proxy')
      return
    }
    
    console.log('🎤 Starting realtime listening...')
    setIsListening(true)
    setStatus('Listening...')
  }, [])

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('🔇 Stopping listening...')
    setIsListening(false)
    setStatus('Connected')
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('🛑 Disconnecting...')
    if (wsRef.current) {
      wsRef.current.close()
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setIsConnected(false)
    setIsInitializing(false)
    setIsListening(false)
    setIsSpeaking(false)
    setStatus('Disconnected')
    setError(null)
    setCurrentMessage('')
    sessionIdRef.current = null
    audioQueueRef.current = []
    isPlayingAudioRef.current = false
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div className="relative w-full max-w-md mx-auto bg-black rounded-3xl shadow-2xl border border-gray-800 p-8 flex flex-col items-center justify-center min-h-[500px]">
      {/* Ring Movie Style Orb */}
      <div className="relative mb-8">
        <div className="relative w-48 h-48">
          <motion.button
            onClick={isConnected ? (isListening ? stopListening : startListening) : connect}
            disabled={isInitializing}
            className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${
              isConnected 
                ? (isListening ? 'bg-red-600/20 hover:bg-red-600/30' : 'bg-green-600/20 hover:bg-green-600/30')
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } ${isInitializing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              scale: isSpeaking ? [1, 1.05, 1] : 1,
            }}
            transition={{
              scale: { duration: 0.8, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }
            }}
            style={{
              background: isConnected 
                ? (isListening ? 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, rgba(0, 0, 0, 0.8) 70%)' 
                  : 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, rgba(0, 0, 0, 0.8) 70%)')
                : 'radial-gradient(circle, rgba(55, 65, 81, 0.3) 0%, rgba(0, 0, 0, 0.9) 70%)',
              border: '2px solid rgba(168, 85, 247, 0.3)',
              boxShadow: isConnected 
                ? (isListening ? '0 0 30px rgba(239, 68, 68, 0.5), inset 0 0 30px rgba(239, 68, 68, 0.1)' 
                  : '0 0 30px rgba(34, 197, 94, 0.5), inset 0 0 30px rgba(34, 197, 94, 0.1)')
                : '0 0 30px rgba(168, 85, 247, 0.3), inset 0 0 30px rgba(168, 85, 247, 0.1)'
            }}
          >
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-500/10 to-transparent" />
            
            <div className="relative z-10 flex items-center justify-center">
              {isInitializing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full"
                />
              ) : isConnected ? (
                <div className="text-white text-2xl">
                  {isListening ? '🎤' : (isSpeaking ? '🔊' : '👂')}
                </div>
              ) : (
                <div className="text-white text-2xl">📞</div>
              )}
            </div>

            {/* Helix Wave Lines */}
            <div className="absolute inset-0 rounded-full pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 bg-purple-400 rounded-full pointer-events-none"
                  style={{
                    height: '20px',
                    left: '50%',
                    top: '-10px',
                    transformOrigin: '50% 134px',
                    transform: `rotate(${i * 30}deg) translateY(-134px)`,
                    opacity: isConnected ? (isSpeaking ? 0.8 : 0.4) : 0.2,
                    boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)',
                    zIndex: 1
                  }}
                  animate={isSpeaking ? {
                    opacity: [0.4, 0.8, 0.4],
                    scale: [1, 1.2, 1]
                  } : {}}
                  transition={{
                    duration: 0.8,
                    repeat: isSpeaking ? Infinity : 0,
                    delay: i * 0.1
                  }}
                />
              ))}
            </div>
          </motion.button>

          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-purple-400/20 to-purple-500/20 blur-xl pointer-events-none" />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center mb-6">
        <div className={`w-3 h-3 rounded-full mr-3 ${
          isConnected ? (isListening ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-500'
        }`} />
        <span className="text-gray-300 text-sm font-medium">{status}</span>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm text-center mb-4 p-3 bg-red-900/20 rounded-lg border border-red-500/30"
        >
          {error}
        </motion.div>
      )}

      {/* Current Message */}
      {currentMessage && (
        <div className="w-full bg-gray-900/50 rounded-lg p-4 text-left mb-4">
          <div className="text-sm text-purple-300">
            <span className="font-semibold">AI:</span>
            <span className="ml-2">{currentMessage}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">
          {!isConnected ? 'Click the orb to connect' : 
           isListening ? 'Speak now...' : 
           isSpeaking ? 'AI is speaking...' : 
           'Click the orb to speak'}
        </p>
        {error && (error.includes('permission') || error.includes('Microphone') || error.includes('Audio initialization failed')) && (
          <button
            onClick={() => {
              setError(null)
              connect()
            }}
            className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
          >
            Allow Microphone & Retry
          </button>
        )}
      </div>
    </div>
  )
}

export default RealRealtimeVoice