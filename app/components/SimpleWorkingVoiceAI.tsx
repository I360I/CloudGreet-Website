"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SimpleWorkingVoiceAIProps {
  businessName: string
  businessType: string
  services: string
  hours: string
}

const SimpleWorkingVoiceAI: React.FC<SimpleWorkingVoiceAIProps> = ({
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

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingAudioRef = useRef(false)
  const recognitionRef = useRef<any>(null)

  // Initialize audio context and microphone
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎤 Initializing simple audio system...')
      
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

      console.log('✅ Simple audio system initialized')
      return true
    } catch (err: any) {
      console.error('❌ Audio initialization failed:', err)
      setError(`Audio error: ${err.message}`)
      return false
    }
  }, [])

  // Play audio response from OpenAI TTS
  const playAudioResponse = useCallback(async (text: string) => {
    if (!audioContextRef.current) return

    try {
      console.log('🔊 Playing AI response:', text)
      setIsSpeaking(true)
      
      // Use Web Speech API for simple TTS
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = speechSynthesis.getVoices().find(voice => voice.name.includes('Google')) || speechSynthesis.getVoices()[0]
      utterance.rate = 0.9
      utterance.pitch = 1.0
      
      utterance.onend = () => {
        setIsSpeaking(false)
      }
      
      speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('❌ Error playing audio:', error)
      setIsSpeaking(false)
    }
  }, [])

  // Connect and start the system
  const connect = useCallback(async () => {
    try {
      console.log('🚀 Starting simple working voice system...')
      setIsInitializing(true)
      setError(null)

      // Initialize audio first
      const audioReady = await initializeAudio()
      if (!audioReady) {
        throw new Error('Audio initialization failed')
      }

      // Initialize speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

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
          if (event.error === 'no-speech') {
            console.log('🔇 No speech detected, continuing to listen...')
          }
        }
      } else {
        throw new Error('Speech recognition not supported in this browser')
      }

      setIsConnected(true)
      setIsInitializing(false)
      setStatus('Connected - Say something!')
      
      // Send initial greeting
      await handleUserInput('Hello, I just connected to the voice system.')
      
    } catch (err: any) {
      console.error('❌ Connection failed:', err)
      setError(`Connection failed: ${err.message}`)
      setIsInitializing(false)
    }
  }, [initializeAudio])

  // Handle user input and get AI response
  const handleUserInput = useCallback(async (input: string) => {
    try {
      console.log('💬 User input:', input)
      setCurrentMessage('AI is thinking...')
      
      // Send to OpenAI API for response
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
      await playAudioResponse(data.response)
      
    } catch (error: any) {
      console.error('❌ Error getting AI response:', error)
      setError(`AI response error: ${error.message}`)
    }
  }, [businessName, businessType, services, hours, playAudioResponse])

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available')
      return
    }
    
    console.log('🎤 Starting speech recognition...')
    setIsListening(true)
    setStatus('Listening...')
    recognitionRef.current.start()
  }, [])

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('🔇 Stopping speech recognition...')
    setIsListening(false)
    setStatus('Connected')
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('🛑 Disconnecting...')
    if (recognitionRef.current) {
      recognitionRef.current.stop()
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

export default SimpleWorkingVoiceAI
