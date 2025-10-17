"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Phone, PhoneOff } from 'lucide-react'

interface WorkingVoiceDemoProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
}

export default function WorkingVoiceDemo({
  businessName = 'CloudGreet',
  businessType = 'AI Voice Assistant',
  services = 'HVAC, Roofing, Painting',
  hours = 'Mon-Fri 8AM-6PM'
}: WorkingVoiceDemoProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'ai', message: string, timestamp: Date}>>([])

  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser')
      return false
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'
    recognitionRef.current.maxAlternatives = 1

    recognitionRef.current.onstart = () => {
      console.log('🎤 Speech recognition started')
      setIsListening(true)
    }

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        }
      }

      if (finalTranscript) {
        console.log('🎤 User said:', finalTranscript)
        handleUserInput(finalTranscript)
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error)
      if (event.error === 'no-speech') {
        setTimeout(() => {
          if (recognitionRef.current && isConnected) {
            try {
              recognitionRef.current.start()
            } catch (e) {
              console.log('Recognition already started')
            }
          }
        }, 500)
      } else {
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
      }
    }

    recognitionRef.current.onend = () => {
      console.log('🎤 Speech recognition ended')
      setIsListening(false)
      if (isConnected && !isSpeaking) {
        setTimeout(() => {
          if (recognitionRef.current && isConnected) {
            try {
              recognitionRef.current.start()
            } catch (e) {
              console.log('Recognition already started')
            }
          }
        }, 100)
      }
    }

    return true
  }, [isConnected, isSpeaking])

  // Handle user input
  const handleUserInput = useCallback(async (userInput: string) => {
    console.log('🤖 Processing user input:', userInput)
    setConversationHistory(prev => [...prev, { type: 'user', message: userInput, timestamp: new Date() }])
    setCurrentMessage('Thinking...')

    try {
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
          hours,
          conversationHistory: conversationHistory.map(entry => ({ 
            role: entry.type === 'user' ? 'user' : 'assistant', 
            content: entry.message 
          }))
        }),
      })

      if (!response.ok) {
        throw new Error(`AI chat API error: ${response.statusText}`)
      }

      const data = await response.json()
      const aiResponse = data.response
      
      console.log('🤖 AI response:', aiResponse)
      setConversationHistory(prev => [...prev, { type: 'ai', message: aiResponse, timestamp: new Date() }])
      setCurrentMessage(aiResponse)
      
      speakResponse(aiResponse)
    } catch (err: any) {
      console.error('🤖 AI error:', err)
      setError(`AI error: ${err.message}`)
      setCurrentMessage('I am having trouble responding right now.')
      speakResponse('I am having trouble responding right now.')
    }
  }, [businessName, businessType, services, hours, conversationHistory])

  // Speak response
  const speakResponse = useCallback((text: string) => {
    if (typeof window === 'undefined') return
    
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis not supported in this browser')
      return
    }

    console.log('🔊 Speaking:', text)
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const speakWithVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') || 
        voice.name.includes('Samantha') ||
        voice.name.includes('Alex') ||
        voice.lang.startsWith('en-')
      )
      
      if (preferredVoice) {
        utterance.voice = preferredVoice
        console.log('🔊 Using voice:', preferredVoice.name)
      }

      utterance.onstart = () => {
        console.log('🔊 Speech synthesis started')
        setIsSpeaking(true)
        recognitionRef.current?.stop()
      }

      utterance.onend = () => {
        console.log('🔊 Speech synthesis ended')
        setIsSpeaking(false)
        setCurrentMessage('')
        if (isConnected && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            console.log('Recognition already started')
          }
        }
      }

      utterance.onerror = (event) => {
        console.error('🔊 Speech synthesis error:', event.error)
        setIsSpeaking(false)
      }

      synthesisRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = speakWithVoice
    } else {
      speakWithVoice()
    }
  }, [isConnected])

  // Connect to voice system
  const connect = useCallback(async () => {
    console.log('🔌 Connecting to voice system...')
    try {
      setError(null)
      
      const recognitionReady = initializeSpeechRecognition()
      if (!recognitionReady) return

      recognitionRef.current?.start()
      setIsConnected(true)
      console.log('✅ Connected to voice system')

    } catch (error: any) {
      console.error('❌ Connection error:', error)
      setError(error.message)
    }
  }, [initializeSpeechRecognition])

  // Disconnect from voice system
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from voice system...')
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
      recognitionRef.current = null
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setCurrentMessage('')
    setError(null)
    console.log('✅ Disconnected from voice system')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-white">{businessName}</h1>
          <p className="text-gray-400">WORKING VOICE DEMO v3.0</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        {/* Voice Interface */}
        <div className="relative mb-8">
          <motion.button
            onClick={isConnected ? disconnect : connect}
            className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
              isConnected 
                ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25' 
                : 'bg-gray-800 hover:bg-gray-700 shadow-lg shadow-gray-500/25'
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
                  <PhoneOff className="w-12 h-12 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="disconnected"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <Phone className="w-12 h-12 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Status indicators */}
          <div className="absolute -top-2 -right-2">
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
                >
                  <Mic className="w-5 h-5 text-white" />
                </motion.div>
              )}
              {isSpeaking && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center"
                >
                  <Volume2 className="w-5 h-5 text-white" />
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
                <h2 className="text-3xl font-semibold text-white mb-2">WORKING VOICE DEMO</h2>
                <p className="text-gray-400 text-lg">Click the button to start REAL voice conversation</p>
              </motion.div>
            )}
            
            {isConnected && !isListening && !isSpeaking && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-3xl font-semibold text-green-400 mb-2">CONNECTED</h2>
                <p className="text-gray-400 text-lg">Speak naturally - I'm listening</p>
              </motion.div>
            )}
            
            {isListening && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-3xl font-semibold text-blue-400 mb-2">LISTENING...</h2>
                <p className="text-gray-400 text-lg">Speak clearly</p>
              </motion.div>
            )}
            
            {isSpeaking && (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-3xl font-semibold text-purple-400 mb-2">SPEAKING</h2>
                <p className="text-gray-400 text-lg">AI is responding</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Current Message */}
        {currentMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-8 p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl"
          >
            <p className="text-white text-lg leading-relaxed">{currentMessage}</p>
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}
      </div>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="border-t border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Conversation History</h3>
          <div className="max-h-60 overflow-y-auto space-y-3">
            {conversationHistory.map((entry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg ${
                  entry.type === 'user' 
                    ? 'bg-blue-500/20 border border-blue-500/30 ml-8' 
                    : 'bg-gray-800/50 border border-gray-700 mr-8'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    entry.type === 'user' ? 'text-blue-400' : 'text-purple-400'
                  }`}>
                    {entry.type === 'user' ? 'You' : 'AI'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-white text-sm">{entry.message}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
