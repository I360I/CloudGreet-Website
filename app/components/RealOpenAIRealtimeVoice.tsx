"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Mic, Volume2, XCircle, PhoneOff, Settings } from 'lucide-react'

interface RealOpenAIRealtimeVoiceProps {
  businessName: string
  businessType: string
  services: string
  hours: string
}

const RealOpenAIRealtimeVoice: React.FC<RealOpenAIRealtimeVoiceProps> = ({
  businessName,
  businessType,
  services,
  hours,
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [status, setStatus] = useState('Disconnected')
  const [error, setError] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const clientSecretRef = useRef<string | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingAudioRef = useRef(false)

  // Initialize AudioContext and microphone for realtime streaming
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎤 Initializing audio for REAL OpenAI Realtime...')
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream)

      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      scriptProcessorRef.current.onaudioprocess = (event) => {
        if (isListening && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0)
          // Convert Float32Array to Int16Array (PCM16) for realtime streaming
          const pcm16 = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF
          }
          // Send audio data directly to WebSocket for realtime processing
          wsRef.current.send(pcm16)
        }
      }

      mediaStreamSourceRef.current.connect(scriptProcessorRef.current)
      scriptProcessorRef.current.connect(audioContextRef.current.destination)

      console.log('🎤 Audio initialized for REAL OpenAI Realtime')
      return true
    } catch (err: any) {
      console.error('❌ Audio initialization failed:', err)
      setError(`Audio error: ${err.message}`)
      return false
    }
  }, [isListening])

  // Play realtime audio response
  const playAudioResponse = useCallback(async (audioBase64: string) => {
    if (!audioContextRef.current) return

    const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0)).buffer

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData)
      audioQueueRef.current.push(audioBuffer.getChannelData(0))
      if (!isPlayingAudioRef.current) {
        processAudioQueue()
      }
    } catch (error) {
      console.error('❌ Error decoding realtime audio data:', error)
    }
  }, [])

  const processAudioQueue = useCallback(() => {
    if (audioQueueRef.current.length > 0 && audioContextRef.current && !isPlayingAudioRef.current) {
      isPlayingAudioRef.current = true
      setIsSpeaking(true)

      const audioData = audioQueueRef.current.shift()
      if (!audioData) {
        isPlayingAudioRef.current = false
        setIsSpeaking(false)
        return
      }

      const buffer = audioContextRef.current.createBuffer(1, audioData.length, audioContextRef.current.sampleRate)
      const newFloat32Array = new Float32Array(audioData)
      buffer.copyToChannel(newFloat32Array, 0)

      const source = audioContextRef.current.createBufferSource()
      source.buffer = buffer
      source.connect(audioContextRef.current.destination)
      source.onended = () => {
        isPlayingAudioRef.current = false
        processAudioQueue()
      }
      source.start(0)
    } else if (audioQueueRef.current.length === 0 && isPlayingAudioRef.current) {
      isPlayingAudioRef.current = false
      setIsSpeaking(false)
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
        const errorData = await response.json()
        throw new Error(`Session creation failed: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      sessionIdRef.current = data.session_id
      clientSecretRef.current = data.client_secret
      console.log('✅ Session created:', data.session_id)
      return true
    } catch (error: any) {
      console.error('❌ Session creation error:', error)
      setError(`Session creation failed: ${error.message}`)
      return false
    }
  }, [businessName])

  // Connect to OpenAI Realtime API through server-side WebSocket proxy
  const connectToOpenAI = useCallback(async () => {
    try {
      if (!sessionIdRef.current || !clientSecretRef.current) {
        throw new Error('Session not created')
      }

      console.log('🔌 Creating server-side REAL OpenAI Realtime WebSocket...')
      
      // Create server-side WebSocket connection
      const wsResponse = await fetch('/api/voice/realtime-proxy-websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          clientSecret: clientSecretRef.current,
          businessName
        }),
      })

      if (!wsResponse.ok) {
        const errorData = await wsResponse.json()
        throw new Error(`REAL OpenAI Realtime WebSocket failed: ${errorData.error}`)
      }

      const wsData = await wsResponse.json()
      console.log('✅ REAL OpenAI Realtime WebSocket ready:', wsData.message)
      
      // Now connect to OpenAI Realtime API directly with session credentials
      console.log('🔌 Connecting to OpenAI Realtime API for REAL streaming...')
      
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&session_id=${sessionIdRef.current}&client_secret=${clientSecretRef.current}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ Connected to OpenAI Realtime API for REAL streaming')
        
        // Send session configuration for realtime streaming
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
        console.log('🔐 Sent REAL realtime streaming configuration')
        
        // Start the conversation immediately
        const startConversation = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Hello, I just connected to the voice system.'
              }
            ]
          }
        }
        
        ws.send(JSON.stringify(startConversation))
        console.log('🎤 Started REAL realtime conversation')
        
        setIsConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 Received from OpenAI Realtime:', data.type, data)

          if (data.type === 'error') {
            console.error('❌ OpenAI Realtime error:', data.error)
            setError(`OpenAI Realtime error: ${data.error?.message || 'Unknown error'}`)
            return
          }

          if (data.type === 'response.audio.delta') {
            // Handle realtime audio response
            if (data.delta) {
              playAudioResponse(data.delta)
            }
          } else if (data.type === 'response.text.delta') {
            // Handle realtime text response
            setCurrentMessage(prev => prev + (data.delta || ''))
          } else if (data.type === 'response.done') {
            // Response complete
            setIsSpeaking(false)
            setCurrentMessage('')
            setConversationHistory(prev => [...prev, { role: 'assistant', content: currentMessage }])
          } else if (data.type === 'session.created') {
            console.log('✅ REAL Realtime session created successfully')
          } else if (data.type === 'session.updated') {
            console.log('✅ REAL Realtime session updated')
          } else if (data.type === 'conversation.item.input_audio_buffer.committed') {
            console.log('🎤 REAL Realtime audio input committed')
          } else if (data.type === 'conversation.item.output_audio_buffer.committed') {
            console.log('🔊 REAL Realtime audio output committed')
          }
        } catch (error) {
          console.error('❌ Error parsing REAL Realtime WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ REAL Realtime WebSocket error:', error)
        setError('Connection error with OpenAI Realtime API')
        setIsConnected(false)
        setIsListening(false)
        setIsSpeaking(false)
      }

      ws.onclose = (event) => {
        console.log('🔌 REAL Realtime WebSocket connection closed', event.code, event.reason)
        setIsConnected(false)
        setIsListening(false)
        setIsSpeaking(false)
        if (event.code !== 1000) {
          setError(`REAL Realtime connection closed unexpectedly: ${event.reason || event.code}`)
        }
      }
    } catch (error: any) {
      console.error('❌ REAL Realtime connection error:', error)
      setError(`REAL Realtime connection failed: ${error.message}`)
      setIsConnected(false)
      setIsListening(false)
      setIsSpeaking(false)
    }
  }, [initializeAudio, playAudioResponse, businessName, currentMessage])

  // Start listening for realtime streaming
  const startListening = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('REAL Realtime WebSocket not connected.')
      return
    }
    console.log('🎤 Starting REAL realtime listening...')
    setIsListening(true)

    // Send start listening message for realtime streaming
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

    console.log('🔇 Stopping REAL realtime listening...')
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

  // Connect to realtime voice system
  const connect = useCallback(async () => {
    try {
      console.log('🚀 Starting REAL OpenAI Realtime voice system...')
      setError(null)

      // Initialize audio
      const audioReady = await initializeAudio()
      if (!audioReady) {
        throw new Error('Audio initialization failed')
      }

      // Create session
      const sessionCreated = await createSession()
      if (!sessionCreated) {
        throw new Error('Session creation failed')
      }

      // Connect to OpenAI Realtime API
      await connectToOpenAI()

      setStatus('Connected')
    } catch (err: any) {
      console.error('❌ REAL Realtime connection failed:', err)
      setError(`REAL Realtime connection failed: ${err.message}`)
      setStatus('Disconnected')
    }
  }, [initializeAudio, createSession, connectToOpenAI])

  // Disconnect from realtime voice system
  const disconnect = useCallback(() => {
    console.log('🛑 Disconnecting REAL OpenAI Realtime voice system...')
    if (wsRef.current) {
      wsRef.current.close()
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect()
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setStatus('Disconnected')
    setConversationHistory([])
    setCurrentMessage('')
    setError(null)
    sessionIdRef.current = null
    clientSecretRef.current = null
    audioQueueRef.current = []
    isPlayingAudioRef.current = false
    console.log('✅ REAL OpenAI Realtime voice system disconnected')
  }, [])

  useEffect(() => {
    if (isConnected) {
      setStatus(isListening ? 'Listening...' : (isSpeaking ? 'Speaking...' : 'Connected'))
    } else {
      setStatus('Disconnected')
    }
  }, [isConnected, isListening, isSpeaking])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div className="relative w-full max-w-md mx-auto bg-black rounded-3xl shadow-2xl border border-gray-800 p-6 flex flex-col items-center justify-center min-h-[400px]">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-16 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-300 z-10"
        >
          <p>Business: {businessName}</p>
          <p>Type: {businessType}</p>
          <p>Services: {services}</p>
          <p>Hours: {hours}</p>
        </motion.div>
      )}

      <div className="flex items-center justify-center mb-6">
        <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-gray-400 text-sm">{status}</span>
      </div>

      <div className="relative mb-8">
        <motion.button
          onClick={isConnected ? disconnect : connect}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isConnected 
              ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30' 
              : 'bg-gray-800 hover:bg-gray-700 shadow-lg shadow-gray-500/30'
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
                <PhoneOff className="w-10 h-10 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="disconnected"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center justify-center"
              >
                <Phone className="w-10 h-10 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {isConnected && (
          <motion.button
            onClick={isListening ? stopListening : startListening}
            className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening 
                ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/30' 
                : 'bg-gray-700 hover:bg-gray-600 shadow-md shadow-gray-500/30'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {isListening ? (
                <motion.div
                  key="listening"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <Volume2 className="w-8 h-8 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="not-listening"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <Mic className="w-8 h-8 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-sm mt-4 text-center"
        >
          <XCircle className="inline-block w-4 h-4 mr-2" />
          {error}
        </motion.div>
      )}

      <div className="mt-8 w-full text-center">
        <p className="text-gray-300 text-lg font-semibold mb-2">
          {isConnected ? (isListening ? 'Speak now...' : (isSpeaking ? 'AI is speaking...' : 'Click mic to speak')) : 'Click phone to connect'}
        </p>
        <div className="bg-gray-900 rounded-lg p-4 h-32 overflow-y-auto text-left text-gray-200 text-sm custom-scrollbar">
          {conversationHistory.map((msg, index) => (
            <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-blue-300' : 'text-purple-300'}`}>
              <strong>{msg.role === 'user' ? 'You:' : 'AI:'}</strong> {msg.content}
            </div>
          ))}
          {currentMessage && (
            <div className="text-purple-300">
              <strong>AI:</strong> {currentMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RealOpenAIRealtimeVoice
