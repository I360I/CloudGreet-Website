"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Volume2, Phone, CheckCircle, AlertTriangle } from 'lucide-react'

interface SimpleWorkingVoiceProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
}

export default function SimpleWorkingVoice({
  businessName = 'CloudGreet',
  businessType = 'AI Voice Assistant',
  services = 'HVAC, Roofing, Painting',
  hours = 'Mon-Fri 8AM-6PM'
}: SimpleWorkingVoiceProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Debug logging
  const addDebugInfo = useCallback((info: string) => {
    console.log('🔍 DEBUG:', info)
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${info}`])
  }, [])

  // Initialize speech recognition - SIMPLE VERSION
  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') {
      addDebugInfo('Window not available')
      return false
    }
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addDebugInfo('Speech recognition not supported')
      setError('Speech recognition not supported in this browser')
      return false
    }

    addDebugInfo('Initializing simple speech recognition...')
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    // SIMPLE SETTINGS
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onstart = () => {
      addDebugInfo('Speech recognition started')
      console.log('🎤 Started listening')
      setIsListening(true)
    }

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      addDebugInfo(`Heard: "${transcript}"`)
      console.log('🎤 User said:', transcript)
      handleUserInput(transcript)
    }

    recognitionRef.current.onerror = (event) => {
      addDebugInfo(`Speech error: ${event.error}`)
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      
      // Don't restart automatically - let user click again
      if (event.error !== 'no-speech') {
        setError(`Speech recognition error: ${event.error}`)
      }
    }

    recognitionRef.current.onend = () => {
      addDebugInfo('Speech recognition ended')
      console.log('🎤 Stopped listening')
      setIsListening(false)
    }

    addDebugInfo('Simple speech recognition configured')
    return true
  }, [addDebugInfo])

  // Handle user input with AI response
  const handleUserInput = useCallback(async (userInput: string) => {
    addDebugInfo(`Processing: "${userInput}"`)
    console.log('🤖 Processing user input:', userInput)
    
    try {
      // Call OpenAI API for real AI response
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          businessName,
          businessType,
          services,
          hours
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.response

      addDebugInfo(`AI Response: "${aiResponse}"`)
      console.log('🤖 AI Response:', aiResponse)
      setCurrentMessage(aiResponse)
      
      // Speak the response
      speakResponse(aiResponse)
    } catch (error: any) {
      addDebugInfo(`AI Error: ${error.message}`)
      console.error('AI Error:', error)
      
      // Fallback to simple response
      const fallbackResponse = `I heard you say "${userInput}". How can I help you today?`
      setCurrentMessage(fallbackResponse)
      speakResponse(fallbackResponse)
    }
  }, [businessName, businessType, services, hours, addDebugInfo])

  // Speak response using Web Speech API
  const speakResponse = useCallback((text: string) => {
    if (typeof window === 'undefined') return
    
    if (!('speechSynthesis' in window)) {
      addDebugInfo('Speech synthesis not supported')
      setError('Speech synthesis not supported in this browser')
      return
    }

    addDebugInfo('Starting speech synthesis...')
    // Stop any current speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.8
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      addDebugInfo('Speaking started')
      console.log('🔊 Speaking:', text)
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      addDebugInfo('Speaking finished')
      console.log('🔊 Finished speaking')
      setIsSpeaking(false)
      setCurrentMessage('')
    }

    utterance.onerror = (event) => {
      addDebugInfo(`Speech synthesis error: ${event.error}`)
      console.error('Speech synthesis error:', event.error)
      setIsSpeaking(false)
    }

    synthesisRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [addDebugInfo])

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        addDebugInfo('Starting speech recognition...')
        recognitionRef.current.start()
      } catch (e) {
        addDebugInfo('Already listening or error')
      }
    }
  }, [isListening, addDebugInfo])

  // Connect to voice system
  const connect = useCallback(async () => {
    try {
      setError(null)
      setDebugInfo([])
      addDebugInfo('Starting simple voice AI connection...')
      console.log('🚀 Starting simple voice AI...')

      // Initialize speech recognition
      const speechReady = initializeSpeechRecognition()
      if (!speechReady) return

      setIsConnected(true)
      addDebugInfo('Simple voice AI connected successfully')
      console.log('✅ Simple voice AI ready')

    } catch (error: any) {
      addDebugInfo(`Connection error: ${error.message}`)
      console.error('Connection error:', error)
      setError(error.message)
    }
  }, [initializeSpeechRecognition, addDebugInfo])

  // Disconnect from voice system
  const disconnect = useCallback(() => {
    addDebugInfo('Disconnecting simple voice AI...')
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Stop speech synthesis
    if (synthesisRef.current) {
      window.speechSynthesis.cancel()
    }

    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setCurrentMessage('')
    setError(null)
    addDebugInfo('Simple voice AI disconnected')
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
      {/* Simple Working Voice Orb */}
      <div className="relative mb-8">
        <motion.button
          onClick={isConnected ? (isListening ? null : startListening) : connect}
          disabled={!isConnected && !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)}
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
                Ready to Connect
              </h2>
              <p className="text-gray-400">Click to start simple voice AI</p>
            </motion.div>
          )}
          
          {orbState === 'listening' && (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-purple-400">
                Listening...
              </h2>
              <p className="text-gray-400">Speak clearly into your microphone</p>
            </motion.div>
          )}
          
          {orbState === 'speaking' && (
            <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-purple-400">
                AI Speaking
              </h2>
              <p className="text-gray-400">AI is responding</p>
            </motion.div>
          )}
          
          {orbState === 'connected' && (
            <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-green-400">
                Connected
              </h2>
              <p className="text-gray-400">Click to start listening - SPEAK NOW!</p>
            </motion.div>
          )}
          
          {orbState === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-2 text-red-400">
                Error
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

      {/* Test Button */}
      {isConnected && (
        <motion.div
          className="max-w-md mx-auto mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => {
              addDebugInfo('Manual test: Hello, how are you?')
              handleUserInput('Hello, how are you?')
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mr-4"
          >
            Test AI Response
          </button>
          <button
            onClick={() => {
              addDebugInfo('Manual test: What services do you offer?')
              handleUserInput('What services do you offer?')
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Test Services
          </button>
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
            <h3 className="text-white text-sm font-bold mb-2">Debug Info:</h3>
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
