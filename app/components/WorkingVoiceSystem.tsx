"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'

interface WorkingVoiceSystemProps {
  businessName: string
  businessType: string
  services: string
  hours: string
}

export default function WorkingVoiceSystem({ 
  businessName, 
  businessType, 
  services, 
  hours 
}: WorkingVoiceSystemProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentMessage, setCurrentMessage] = useState('')
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([])

  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const clientSecretRef = useRef<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // Initialize audio
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎤 Initializing audio...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      mediaStreamRef.current = stream
      audioContextRef.current = new AudioContext()
      
      console.log('🎤 Audio initialized successfully')
      return true
    } catch (error: any) {
      console.error('❌ Audio initialization failed:', error)
      setError(`Audio error: ${error.message}`)
      return false
    }
  }, [])

  // Create OpenAI Realtime API session
  const createSession = useCallback(async () => {
    try {
      console.log('🔑 Creating OpenAI Realtime session...')
      
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: 'alloy',
          businessName
        }),
      })

      if (!response.ok) {
        throw new Error(`Session creation failed: ${response.statusText}`)
      }

      const data = await response.json()
      sessionIdRef.current = data.session_id
      clientSecretRef.current = data.client_secret
      
      console.log('✅ Session created:', data.session_id)
      return true
    } catch (error: any) {
      console.error('❌ Session creation failed:', error)
      setError(`Session creation failed: ${error.message}`)
      return false
    }
  }, [businessName])

  // Connect to OpenAI Realtime API
  const connectToOpenAI = useCallback(async () => {
    try {
      if (!sessionIdRef.current || !clientSecretRef.current) {
        throw new Error('Session not created')
      }

      console.log('🔌 Testing authenticated WebSocket connection...')
      
      // Test authenticated WebSocket connection first
      const authResponse = await fetch('/api/voice/websocket-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          clientSecret: clientSecretRef.current
        }),
      })

      if (!authResponse.ok) {
        const errorData = await authResponse.json()
        throw new Error(`Authenticated WebSocket failed: ${errorData.error}`)
      }

      const authData = await authResponse.json()
      console.log('✅ Authenticated WebSocket test:', authData.message)
      
      // Since authenticated connection works, now connect directly
      console.log('🔌 Connecting to OpenAI Realtime API...')
      
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&session_id=${sessionIdRef.current}&client_secret=${clientSecretRef.current}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Connected to OpenAI Realtime API')
        setIsConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 Received from OpenAI:', data.type, data)

          if (data.type === 'error') {
            console.error('❌ OpenAI error:', data.error)
            setError(`OpenAI error: ${data.error?.message || 'Unknown error'}`)
            return
          }

          if (data.type === 'response.audio.delta') {
            // Handle audio response
            if (data.delta) {
              playAudioResponse(data.delta)
            }
          } else if (data.type === 'response.text.delta') {
            // Handle text response
            setCurrentMessage(prev => prev + (data.delta || ''))
          } else if (data.type === 'response.done') {
            // Response complete
            setIsSpeaking(false)
            setCurrentMessage('')
          } else if (data.type === 'session.created') {
            console.log('✅ Session created successfully')
          } else if (data.type === 'session.updated') {
            console.log('✅ Session updated')
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setError('Connection error with OpenAI Realtime API')
      }

      ws.onclose = () => {
        console.log('🔌 WebSocket connection closed')
        setIsConnected(false)
        setIsListening(false)
        setIsSpeaking(false)
      }

    } catch (error: any) {
      console.error('❌ Connection failed:', error)
      setError(`Connection failed: ${error.message}`)
    }
  }, [])

  // Play audio response
  const playAudioResponse = useCallback((audioData: string) => {
    try {
      if (!audioContextRef.current) return

      const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
      const audioBufferSource = audioContextRef.current.createBufferSource()
      
      audioContextRef.current.decodeAudioData(audioBuffer.buffer).then(buffer => {
        audioBufferSource.buffer = buffer
        audioBufferSource.connect(audioContextRef.current!.destination)
        audioBufferSource.start()
        setIsSpeaking(true)
      })
    } catch (error) {
      console.error('❌ Audio playback error:', error)
    }
  }, [])

  // Start listening
  const startListening = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    console.log('🎤 Starting to listen...')
    setIsListening(true)

    // Send start listening message
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_audio_buffer',
            audio: ''
          }
        ]
      }
    }))
  }, [])

  // Stop listening
  const stopListening = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    console.log('🔇 Stopping listening...')
    setIsListening(false)

    // Send stop listening message
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_audio_buffer',
            audio: ''
          }
        ]
      }
    }))
  }, [])

  // Connect to voice system
  const connect = useCallback(async () => {
    try {
      console.log('🚀 Starting voice system connection...')
      setError(null)
      setIsConnecting(true)

      // Initialize audio
      const audioReady = await initializeAudio()
      if (!audioReady) return

      // Create session
      const sessionReady = await createSession()
      if (!sessionReady) return

      // Connect to OpenAI
      await connectToOpenAI()

      console.log('✅ Voice system connected successfully')
    } catch (error: any) {
      console.error('❌ Voice system connection failed:', error)
      setError(`Connection failed: ${error.message}`)
    } finally {
      setIsConnecting(false)
    }
  }, [initializeAudio, createSession, connectToOpenAI])

  // Disconnect
  const disconnect = useCallback(() => {
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
    
    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setCurrentMessage('')
    setError(null)
    
    console.log('🔌 Voice system disconnected')
  }, [])

  // Handle connect/disconnect
  const handleConnect = useCallback(() => {
    if (isConnected) {
      disconnect()
    } else {
      connect()
    }
  }, [isConnected, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Clean, Professional Voice Interface */}
      <div className="bg-black border border-gray-700 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-white mb-2">AI Voice Assistant</h3>
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm text-gray-400">
              {isConnected ? 'Ready to talk' : 'Click to connect'}
            </span>
          </div>
        </div>

        {/* Main Voice Button */}
        <div className="flex justify-center mb-6">
          <motion.button
            onClick={handleConnect}
            disabled={isConnecting}
            className={`w-20 h-20 rounded-full border-2 transition-all duration-300 ${
              isConnected 
                ? 'bg-green-500 border-green-400 hover:bg-green-600' 
                : 'bg-blue-500 border-blue-400 hover:bg-blue-600'
            } ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              scale: isSpeaking ? [1, 1.1, 1] : 1,
            }}
            transition={{
              scale: { duration: 0.8, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }
            }}
          >
            {isConnecting ? (
              <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
            ) : isConnected ? (
              <div className="text-white text-2xl">🎤</div>
            ) : (
              <div className="text-white text-2xl">▶️</div>
            )}
          </motion.button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )}

        {currentMessage && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
            <div className="text-blue-300 text-sm">
              <span className="font-semibold">AI:</span> {currentMessage}
            </div>
          </div>
        )}

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-3 max-h-24 overflow-y-auto">
            <div className="text-xs text-gray-300 space-y-1">
              {conversationHistory.slice(-2).map((msg, idx) => (
                <div key={idx} className={`${msg.role === 'user' ? 'text-blue-300' : 'text-green-300'}`}>
                  <span className="font-semibold capitalize">{msg.role}:</span> {msg.content}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            {isConnected ? 'Speak naturally - AI will respond' : 'Click the button to start'}
          </p>
        </div>
      </div>
    </div>
  )
}
