"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Phone, PhoneOff, Settings, X } from 'lucide-react'

interface PerfectVoiceSystemProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
}

export default function PerfectVoiceSystem({
  businessName = 'CloudGreet',
  businessType = 'AI Voice Assistant',
  services = 'HVAC, Roofing, Painting',
  hours = 'Mon-Fri 8AM-6PM'
}: PerfectVoiceSystemProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'ai', message: string, timestamp: Date}>>([])

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const clientSecretRef = useRef<string | null>(null)

  // Initialize audio context and analyser
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      console.log('🎤 Audio initialized successfully')
      return true
    } catch (error: any) {
      console.error('❌ Audio initialization failed:', error)
      setError(`Audio initialization failed: ${error.message}`)
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
  }, [])

  // Connect to OpenAI Realtime API
  const connectToOpenAI = useCallback(async () => {
    try {
      if (!sessionIdRef.current || !clientSecretRef.current) {
        throw new Error('Session not created')
      }

      console.log('🔌 Connecting to OpenAI Realtime API...')
      
      // Get API key from environment
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not found in environment')
      }
      
      const wsUrl = `wss://api.openai.com/v1/realtime?api_key=${apiKey}&session_id=${sessionIdRef.current}&client_secret=${clientSecretRef.current}`
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
            // Session is ready, we can start sending messages
          } else if (data.type === 'session.updated') {
            console.log('✅ Session updated')
          } else if (data.type === 'conversation.item.input_audio_buffer.committed') {
            console.log('🎤 Audio input committed')
          } else if (data.type === 'conversation.item.output_audio_buffer.committed') {
            console.log('🔊 Audio output committed')
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
  const playAudioResponse = useCallback(async (audioData: string) => {
    try {
      if (!audioContextRef.current) return

      const audioBuffer = await audioContextRef.current.decodeAudioData(
        Uint8Array.from(atob(audioData), c => c.charCodeAt(0)).buffer
      )

      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start()

      setIsSpeaking(true)
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
      console.error('❌ Connection error:', error)
      setError(error.message)
    }
  }, [initializeAudio, createSession, connectToOpenAI])

  // Disconnect from voice system
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting voice system...')
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
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
    sessionIdRef.current = null
    clientSecretRef.current = null

    console.log('✅ Voice system disconnected')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-white">{businessName}</h1>
          <p className="text-slate-400 text-lg">PERFECT VOICE SYSTEM v4.0</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        {/* Voice Interface */}
        <div className="relative mb-12">
          <motion.button
            onClick={isConnected ? disconnect : connect}
            className={`relative w-56 h-56 rounded-full flex items-center justify-center transition-all duration-300 ${
              isConnected 
                ? 'bg-green-600 hover:bg-green-700 shadow-2xl shadow-green-500/30' 
                : 'bg-slate-800 hover:bg-slate-700 shadow-2xl shadow-slate-500/30'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              scale: isSpeaking ? [1, 1.1, 1] : 1,
            }}
            transition={{
              scale: { duration: 0.8, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }
            }}
          >
            <AnimatePresence mode="wait">
              {isConnected ? (
                <motion.div
                  key="connected"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <PhoneOff className="w-16 h-16 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="disconnected"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <Phone className="w-16 h-16 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Status indicators */}
          <div className="absolute -top-3 -right-3">
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <Mic className="w-6 h-6 text-white" />
                </motion.div>
              )}
              {isSpeaking && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <Volume2 className="w-6 h-6 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center mb-8">
          <AnimatePresence mode="wait">
            {!isConnected && (
              <motion.div
                key="disconnected"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-4xl font-bold text-white mb-4">PERFECT VOICE SYSTEM</h2>
                <p className="text-slate-400 text-xl">Click to start REAL OpenAI Realtime conversation</p>
              </motion.div>
            )}
            
            {isConnected && !isListening && !isSpeaking && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-4xl font-bold text-green-400 mb-4">CONNECTED</h2>
                <p className="text-slate-400 text-xl">Speak naturally - AI is listening</p>
              </motion.div>
            )}
            
            {isListening && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-4xl font-bold text-blue-400 mb-4">LISTENING...</h2>
                <p className="text-slate-400 text-xl">Speak clearly</p>
              </motion.div>
            )}
            
            {isSpeaking && (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-4xl font-bold text-purple-400 mb-4">AI SPEAKING</h2>
                <p className="text-slate-400 text-xl">AI is responding</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Current Message */}
        {currentMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto mb-8 p-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl"
          >
            <p className="text-white text-xl leading-relaxed">{currentMessage}</p>
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <p className="text-red-400 text-lg">{error}</p>
          </motion.div>
        )}
      </div>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="border-t border-slate-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Conversation History</h3>
          <div className="max-h-80 overflow-y-auto space-y-4">
            {conversationHistory.map((entry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-xl ${
                  entry.type === 'user' 
                    ? 'bg-blue-500/20 border border-blue-500/30 ml-12' 
                    : 'bg-slate-800/50 border border-slate-700 mr-12'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-lg font-medium ${
                    entry.type === 'user' ? 'text-blue-400' : 'text-purple-400'
                  }`}>
                    {entry.type === 'user' ? 'You' : 'AI'}
                  </span>
                  <span className="text-sm text-slate-500">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-white text-lg">{entry.message}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-white">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-medium text-slate-300 mb-3">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-lg font-medium text-slate-300 mb-3">
                    Services
                  </label>
                  <input
                    type="text"
                    value={services}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-lg font-medium text-slate-300 mb-3">
                    Business Hours
                  </label>
                  <input
                    type="text"
                    value={hours}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
