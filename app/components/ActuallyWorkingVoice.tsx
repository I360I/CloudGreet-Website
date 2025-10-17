"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ActuallyWorkingVoiceProps {
  businessName: string
  businessType: string
  services: string
  hours: string
}

const ActuallyWorkingVoice: React.FC<ActuallyWorkingVoiceProps> = ({
  businessName,
  businessType,
  services,
  hours,
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [status, setStatus] = useState('Click to start')
  const [error, setError] = useState<string | null>(null)
  const [currentMessage, setCurrentMessage] = useState('')

  const recognitionRef = useRef<any>(null)

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error('Speech recognition not supported in this browser')
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started')
      setIsListening(true)
      setStatus('Listening...')
    }

    recognitionRef.current.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('')
      
      if (event.results[event.results.length - 1].isFinal) {
        console.log('🎤 Final transcript:', transcript)
        handleUserInput(transcript)
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error)
      if (event.error !== 'no-speech') {
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
        setStatus('Error occurred')
      }
    }

    recognitionRef.current.onend = () => {
      console.log('🔇 Speech recognition ended')
      setIsListening(false)
      setStatus('Connected')
    }
  }, [])

  // Handle user input and get AI response
  const handleUserInput = useCallback(async (input: string) => {
    if (!input.trim()) return

    try {
      console.log('💬 User said:', input)
      setCurrentMessage('AI is thinking...')
      setIsSpeaking(true)
      
      // Get AI response from our API
      const response = await fetch('/api/voice/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          businessName,
          businessType,
          services,
          hours
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      console.log('🤖 AI response:', data.response)
      
      setCurrentMessage(data.response)
      
      // Use browser TTS to speak the response
      const utterance = new SpeechSynthesisUtterance(data.response)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      
      utterance.onend = () => {
        setIsSpeaking(false)
        console.log('🔊 Finished speaking')
      }
      
      speechSynthesis.speak(utterance)
      
    } catch (error: any) {
      console.error('❌ Error getting AI response:', error)
      setError(`AI response error: ${error.message}`)
      setIsSpeaking(false)
    }
  }, [businessName, businessType, services, hours])

  // Connect and start the system
  const connect = useCallback(async () => {
    try {
      console.log('🚀 Starting actually working voice system...')
      setError(null)

      // Initialize speech recognition
      initializeSpeechRecognition()

      setIsConnected(true)
      setStatus('Connected - Click to speak')
      
      // Send initial greeting
      await handleUserInput('Hello, I just connected to the voice system.')
      
    } catch (err: any) {
      console.error('❌ Connection failed:', err)
      setError(`Connection failed: ${err.message}`)
    }
  }, [initializeSpeechRecognition, handleUserInput])

  // Start/stop listening
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      console.log('🔇 Stopping speech recognition...')
      recognitionRef.current.stop()
    } else {
      console.log('🎤 Starting speech recognition...')
      recognitionRef.current.start()
    }
  }, [isListening])

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('🛑 Disconnecting...')
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    speechSynthesis.cancel()
    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setStatus('Disconnected')
    setError(null)
    setCurrentMessage('')
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
            onClick={isConnected ? toggleListening : connect}
            disabled={isSpeaking}
            className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${
              isConnected 
                ? (isListening ? 'bg-red-600/20 hover:bg-red-600/30' : 'bg-green-600/20 hover:bg-green-600/30')
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } ${isSpeaking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
              {isConnected ? (
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
          {!isConnected ? 'Click the orb to start' : 
           isListening ? 'Speak now...' : 
           isSpeaking ? 'AI is speaking...' : 
           'Click the orb to speak'}
        </p>
        {error && (
          <button
            onClick={() => {
              setError(null)
              connect()
            }}
            className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}

export default ActuallyWorkingVoice
