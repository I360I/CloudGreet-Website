"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Phone, Sparkles, Loader2 } from 'lucide-react'

interface VoiceOrbDemoProps {
  businessName?: string
  isDemo?: boolean
}

export default function VoiceOrbDemo({ businessName = 'CloudGreet', isDemo = true }: VoiceOrbDemoProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [hasStarted, setHasStarted] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<any[]>([])
  
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize Web Speech API for listening
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex
          const text = event.results[current][0].transcript
          setTranscript(text)

          if (event.results[current].isFinal) {
            processUserSpeech(text)
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }

      // Initialize Audio Context for smoother playback
      audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const playAudioFromText = async (text: string) => {
    try {
      setIsSpeaking(true)
      
      // Call OpenAI TTS API via our backend
      const response = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voice: 'alloy' // Options: alloy, echo, fable, onyx, nova, shimmer
        })
      })

      if (!response.ok) {
        throw new Error('TTS failed')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      audioRef.current.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audioRef.current.play()
    } catch (error) {
      console.error('Audio playback error:', error)
      setIsSpeaking(false)
    }
  }

  const processUserSpeech = async (userText: string) => {
    if (!userText.trim()) return

    setTranscript('')
    setIsProcessing(true)

    try {
      // Add user message to history
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: userText }
      ]

      // Call AI conversation API
      const response = await fetch('/api/ai/conversation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          businessName
        })
      })

      if (!response.ok) {
        throw new Error('AI conversation failed')
      }

      const data = await response.json()
      const aiResponse = data.response

      // Update history with AI response
      setConversationHistory([
        ...newHistory,
        { role: 'assistant', content: aiResponse }
      ])

      setIsProcessing(false)

      // Play the AI response with natural voice
      await playAudioFromText(aiResponse)

    } catch (error) {
      console.error('Conversation error:', error)
      setIsProcessing(false)
      // Fallback to generic response
      const fallback = "I'm having a bit of trouble right now, but I'm here to help. Could you try again?"
      await playAudioFromText(fallback)
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice chat requires Chrome, Edge, or Safari browser')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const startDemo = async () => {
    setHasStarted(true)
    const greeting = `Hey there! Thanks for trying out CloudGreet. I'm your AI receptionist. How can I help you today?`
    setConversationHistory([{ role: 'assistant', content: greeting }])
    await playAudioFromText(greeting)
  }

  return (
    <div className="relative">
      {/* Glowing Orb Container */}
      <div className="flex flex-col items-center justify-center py-12 relative">
        {/* Background Glow - Massive and Beautiful */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{
              scale: isSpeaking ? [1, 1.4, 1] : isListening ? [1, 1.2, 1] : isProcessing ? [1, 1.15, 1] : [1, 1.1, 1],
              opacity: isSpeaking ? [0.4, 0.7, 0.4] : isListening ? [0.3, 0.5, 0.3] : isProcessing ? [0.2, 0.4, 0.2] : [0.15, 0.25, 0.15]
            }}
            transition={{
              duration: isSpeaking ? 1.5 : isListening ? 2 : isProcessing ? 1 : 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-96 h-96 md:w-[32rem] md:h-[32rem] rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-[120px]"
          />
        </div>

        {/* Multiple Rotating Rings for Depth */}
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.08, 1] : isListening ? [1, 1.05, 1] : 1,
            rotate: 360
          }}
          transition={{
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: isSpeaking ? 6 : isListening ? 10 : 20, repeat: Infinity, ease: "linear" }
          }}
          className="absolute w-80 h-80 md:w-96 md:h-96 rounded-full border-2 border-gradient-to-r from-purple-500/30 to-blue-500/30"
          style={{ borderImage: 'linear-gradient(90deg, rgba(168,85,247,0.3), rgba(59,130,246,0.3)) 1' }}
        />

        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.12, 1] : isListening ? [1, 1.08, 1] : 1,
            rotate: -360
          }}
          transition={{
            scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: isSpeaking ? 8 : isListening ? 12 : 25, repeat: Infinity, ease: "linear" }
          }}
          className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border-2 border-blue-500/40"
        />

        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.15, 1] : isListening ? [1, 1.1, 1] : 1,
            rotate: 360
          }}
          transition={{
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: isSpeaking ? 10 : isListening ? 15 : 30, repeat: Infinity, ease: "linear" }
          }}
          className="absolute w-48 h-48 md:w-64 md:h-64 rounded-full border-2 border-pink-500/30"
        />

        {/* Main Orb - Stunning Gradient */}
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.2, 1] : isListening ? [1, 1.1, 1] : isProcessing ? [1, 1.05, 1] : [1, 1.03, 1],
            boxShadow: isSpeaking 
              ? [
                  '0 0 80px rgba(168,85,247, 0.8), 0 0 160px rgba(59,130,246, 0.6), 0 0 240px rgba(236,72,153, 0.4)',
                  '0 0 120px rgba(168,85,247, 1), 0 0 200px rgba(59,130,246, 0.8), 0 0 280px rgba(236,72,153, 0.6)',
                  '0 0 80px rgba(168,85,247, 0.8), 0 0 160px rgba(59,130,246, 0.6), 0 0 240px rgba(236,72,153, 0.4)'
                ]
              : isListening
                ? [
                    '0 0 60px rgba(59,130,246, 0.7), 0 0 120px rgba(168,85,247, 0.5), 0 0 180px rgba(236,72,153, 0.3)',
                    '0 0 90px rgba(59,130,246, 0.9), 0 0 150px rgba(168,85,247, 0.7), 0 0 210px rgba(236,72,153, 0.5)',
                    '0 0 60px rgba(59,130,246, 0.7), 0 0 120px rgba(168,85,247, 0.5), 0 0 180px rgba(236,72,153, 0.3)'
                  ]
                : isProcessing
                  ? [
                      '0 0 50px rgba(168,85,247, 0.6), 0 0 100px rgba(59,130,246, 0.4)',
                      '0 0 70px rgba(168,85,247, 0.8), 0 0 140px rgba(59,130,246, 0.6)',
                      '0 0 50px rgba(168,85,247, 0.6), 0 0 100px rgba(59,130,246, 0.4)'
                    ]
                  : '0 0 60px rgba(99, 102, 241, 0.5), 0 0 120px rgba(139, 92, 246, 0.3), 0 0 180px rgba(236,72,153, 0.2)'
          }}
          transition={{
            scale: { duration: isSpeaking || isListening ? 1.2 : isProcessing ? 0.8 : 3, repeat: Infinity, ease: "easeInOut" },
            boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center cursor-pointer group overflow-hidden"
          onClick={hasStarted ? (isProcessing || isSpeaking ? undefined : toggleListening) : startDemo}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          role="button"
          aria-label={!hasStarted ? "Start voice demo" : isListening ? "Stop listening" : isProcessing ? "AI is thinking" : isSpeaking ? "AI is speaking" : "Start speaking"}
        >
          {/* Animated Background Gradient */}
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 opacity-70"
          />

          {/* Inner Glow Layers */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-400/60 to-purple-400/60 blur-2xl" />
          <div className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-300/40 to-pink-300/40 blur-xl" />
          
          {/* Icon */}
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {!hasStarted ? (
                <motion.div
                  key="phone"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.5 }}
                >
                  <Phone className="w-20 h-20 md:w-28 md:h-28 text-white drop-shadow-2xl" aria-hidden="true" />
                </motion.div>
              ) : isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, rotate: 360 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 0.3 } }}
                >
                  <Sparkles className="w-20 h-20 md:w-28 md:h-28 text-white drop-shadow-2xl" aria-hidden="true" />
                </motion.div>
              ) : isListening ? (
                <motion.div
                  key="mic"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  exit={{ scale: 0 }}
                  transition={{ scale: { duration: 0.8, repeat: Infinity }, initial: { duration: 0.3 } }}
                >
                  <Mic className="w-20 h-20 md:w-28 md:h-28 text-white drop-shadow-2xl" aria-hidden="true" />
                </motion.div>
              ) : isSpeaking ? (
                <motion.div
                  key="volume"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.15, 1] }}
                  exit={{ scale: 0 }}
                  transition={{ scale: { duration: 1, repeat: Infinity }, initial: { duration: 0.3 } }}
                >
                  <Volume2 className="w-20 h-20 md:w-28 md:h-28 text-white drop-shadow-2xl" aria-hidden="true" />
                </motion.div>
              ) : (
                <motion.div
                  key="micoff"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <MicOff className="w-20 h-20 md:w-28 md:h-28 text-white/80 drop-shadow-2xl" aria-hidden="true" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pulse Effect When Active */}
          {(isSpeaking || isListening) && (
            <>
              <motion.div
                animate={{
                  scale: [1, 1.8],
                  opacity: [0.7, 0]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className="absolute inset-0 rounded-full border-4 border-white/60"
              />
              <motion.div
                animate={{
                  scale: [1, 2.2],
                  opacity: [0.5, 0]
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.3
                }}
                className="absolute inset-0 rounded-full border-4 border-white/40"
              />
              <motion.div
                animate={{
                  scale: [1, 2.6],
                  opacity: [0.3, 0]
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.6
                }}
                className="absolute inset-0 rounded-full border-4 border-white/20"
              />
            </>
          )}
        </motion.div>

        {/* Status Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <AnimatePresence mode="wait">
            {!hasStarted ? (
              <motion.div
                key="start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h3 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Click to Experience
                </h3>
                <p className="text-gray-400 text-base md:text-lg">Real AI conversation, right here</p>
              </motion.div>
            ) : isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <motion.h3
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-2xl md:text-3xl font-bold mb-3 text-purple-400"
                >
                  Thinking...
                </motion.h3>
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                  <p className="text-gray-300 text-base">AI is crafting a response</p>
                </div>
              </motion.div>
            ) : isListening ? (
              <motion.div
                key="listening"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <motion.h3
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-2xl md:text-3xl font-bold mb-3 text-blue-400"
                >
                  I'm Listening
                </motion.h3>
                <p className="text-gray-300 text-base md:text-lg min-h-[1.75rem]">
                  {transcript || 'Speak naturally...'}
                </p>
              </motion.div>
            ) : isSpeaking ? (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <motion.h3
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                >
                  Speaking...
                </motion.h3>
                <div className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Volume2 className="w-5 h-5 text-purple-400" />
                  </motion.div>
                  <p className="text-gray-300 text-base">Natural AI voice</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h3 className="text-2xl md:text-3xl font-bold mb-3 text-white">Your Turn</h3>
                <p className="text-gray-400 text-base md:text-lg">Click the orb to speak</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Compatibility Note */}
      {isDemo && (
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">💡 Best in Chrome, Edge, or Safari</p>
        </div>
      )}
    </div>
  )
}
