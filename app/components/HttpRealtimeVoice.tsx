"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Mic, Volume2, XCircle, PhoneOff, Settings } from 'lucide-react'

interface HttpRealtimeVoiceProps {
  businessName: string
  businessType: string
  services: string
  hours: string
}

const HttpRealtimeVoice: React.FC<HttpRealtimeVoiceProps> = ({
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const sessionIdRef = useRef<string | null>(null)
  const clientSecretRef = useRef<string | null>(null)
  const isProcessingRef = useRef(false)

  // Create session
  const createSession = useCallback(async () => {
    try {
      console.log('🔑 Creating OpenAI session...')
      
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

  // Process audio through server
  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    try {
      console.log('🎤 Processing audio through server...')
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.wav')
      formData.append('sessionId', sessionIdRef.current || '')
      formData.append('businessName', businessName)
      
      const response = await fetch('/api/voice/process-audio', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Audio processing failed: ${errorData.error}`)
      }

      const data = await response.json()
      console.log('✅ Audio processed:', data.response.content)
      
      // Add to conversation
      setConversationHistory(prev => [...prev, 
        { role: 'user', content: '[Audio message]' },
        { role: 'assistant', content: data.response.content }
      ])
      
      // Simulate speaking
      setIsSpeaking(true)
      setTimeout(() => setIsSpeaking(false), 2000)
      
    } catch (error: any) {
      console.error('❌ Audio processing error:', error)
      setError(`Audio processing failed: ${error.message}`)
    } finally {
      isProcessingRef.current = false
    }
  }, [businessName])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting recording...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await processAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsListening(true)
      console.log('✅ Recording started')
      
    } catch (error: any) {
      console.error('❌ Recording error:', error)
      setError(`Recording failed: ${error.message}`)
    }
  }, [processAudio])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('🔇 Stopping recording...')
      mediaRecorderRef.current.stop()
      setIsListening(false)
      console.log('✅ Recording stopped')
    }
  }, [])

  // Connect to voice system
  const connect = useCallback(async () => {
    try {
      console.log('🚀 Starting HTTP-based realtime voice system...')
      setError(null)

      const sessionCreated = await createSession()
      if (!sessionCreated) {
        throw new Error('Session creation failed')
      }

      setIsConnected(true)
      setStatus('Connected')
      console.log('✅ HTTP realtime voice system connected')
      
    } catch (err: any) {
      console.error('❌ Connection failed:', err)
      setError(`Connection failed: ${err.message}`)
      setStatus('Disconnected')
    }
  }, [createSession])

  // Disconnect from voice system
  const disconnect = useCallback(() => {
    console.log('🛑 Disconnecting HTTP realtime voice system...')
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
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
    isProcessingRef.current = false
    console.log('✅ HTTP realtime voice system disconnected')
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
            onClick={isListening ? stopRecording : startRecording}
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

export default HttpRealtimeVoice
