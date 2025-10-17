"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Settings, X } from 'lucide-react'

interface CleanVoiceInterfaceProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
}

export default function CleanVoiceInterface({
  businessName = 'CloudGreet',
  businessType = 'AI Voice Assistant',
  services = 'HVAC, Roofing, Painting',
  hours = 'Mon-Fri 8AM-6PM'
}: CleanVoiceInterfaceProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'ai', message: string, timestamp: Date}>>([])

  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

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
        handleUserInput(finalTranscript)
      }
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'no-speech') {
        // Restart recognition
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
      
      setConversationHistory(prev => [...prev, { type: 'ai', message: aiResponse, timestamp: new Date() }])
      setCurrentMessage(aiResponse)
      
      speakResponse(aiResponse)
    } catch (err: any) {
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
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        recognitionRef.current?.stop()
      }

      utterance.onend = () => {
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
        console.error('Speech synthesis error:', event.error)
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
    try {
      setError(null)
      
      const recognitionReady = initializeSpeechRecognition()
      if (!recognitionReady) return

      recognitionRef.current?.start()
      setIsConnected(true)

    } catch (error: any) {
      console.error('Connection error:', error)
      setError(error.message)
    }
  }, [initializeSpeechRecognition])

  // Disconnect from voice system
  const disconnect = useCallback(() => {
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
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
          <h1 className="text-2xl font-bold text-white">{businessName}</h1>
          <p className="text-slate-400">AI Voice Assistant</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        {/* Voice Interface */}
        <div className="relative mb-8">
          <motion.button
            onClick={isConnected ? disconnect : connect}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isConnected 
                ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25' 
                : 'bg-slate-800 hover:bg-slate-700 shadow-lg shadow-slate-500/25'
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
                  <PhoneOff className="w-8 h-8 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="disconnected"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <Phone className="w-8 h-8 text-white" />
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
                  className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                >
                  <Mic className="w-3 h-3 text-white" />
                </motion.div>
              )}
              {isSpeaking && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                >
                  <Volume2 className="w-3 h-3 text-white" />
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
                <h2 className="text-xl font-semibold text-white mb-2">Ready to Connect</h2>
                <p className="text-slate-400">Click the button to start voice conversation</p>
              </motion.div>
            )}
            
            {isConnected && !isListening && !isSpeaking && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-xl font-semibold text-green-400 mb-2">Connected</h2>
                <p className="text-slate-400">Speak naturally - I'm listening</p>
              </motion.div>
            )}
            
            {isListening && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-xl font-semibold text-blue-400 mb-2">Listening...</h2>
                <p className="text-slate-400">Speak clearly</p>
              </motion.div>
            )}
            
            {isSpeaking && (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-xl font-semibold text-purple-400 mb-2">Speaking</h2>
                <p className="text-slate-400">AI is responding</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Current Message */}
        {currentMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto mb-8 p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl"
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
        <div className="border-t border-slate-800 p-6">
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
                    : 'bg-slate-800/50 border border-slate-700 mr-8'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    entry.type === 'user' ? 'text-blue-400' : 'text-purple-400'
                  }`}>
                    {entry.type === 'user' ? 'You' : 'AI'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-white text-sm">{entry.message}</p>
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
              className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Services
                  </label>
                  <input
                    type="text"
                    value={services}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business Hours
                  </label>
                  <input
                    type="text"
                    value={hours}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
