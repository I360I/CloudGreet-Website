"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Volume2, Phone, Sparkles } from 'lucide-react'

interface VoiceOrbDemoProps {
  businessName?: string
  isDemo?: boolean
}

export default function VoiceOrbDemo({ businessName = 'CloudGreet', isDemo = true }: VoiceOrbDemoProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [hasStarted, setHasStarted] = useState(false)
  
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis
      
      // Initialize Web Speech API
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

        recognitionRef.current.onerror = () => {
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (synthRef.current) synthRef.current.cancel()
    }
  }, [])

  const speakText = (text: string) => {
    if (!synthRef.current) return

    synthRef.current.cancel()
    setIsSpeaking(true)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voices = synthRef.current.getVoices()
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || voice.name.includes('Natural')
    )
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    synthRef.current.speak(utterance)
  }

  const processUserSpeech = async (userText: string) => {
    if (!userText.trim()) return

    setTranscript('')

    // Demo response
    const demoResponses = [
      "I'd be happy to help you with that. Could you tell me more about what you need?",
      "Great question! Let me get you scheduled. What date works best for you?",
      "Absolutely! We offer several service options. When would you like us to come out?",
      "I can definitely help with that. What's the best phone number to reach you?"
    ]
    
    const response = demoResponses[Math.floor(Math.random() * demoResponses.length)]
    speakText(response)
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition requires Chrome or Edge browser')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const startDemo = () => {
    setHasStarted(true)
    speakText(`Thank you for calling ${businessName}. How can I help you today?`)
  }

  return (
    <div className="relative">
      {/* Glowing Orb Container */}
      <div className="flex flex-col items-center justify-center py-12 relative">
        {/* Background Glow */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              scale: isSpeaking ? [1, 1.3, 1] : isListening ? [1, 1.15, 1] : [1, 1.05, 1],
              opacity: isSpeaking ? [0.3, 0.6, 0.3] : isListening ? [0.2, 0.4, 0.2] : [0.1, 0.15, 0.1]
            }}
            transition={{
              duration: isSpeaking ? 1.5 : isListening ? 2 : 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-72 h-72 md:w-96 md:h-96 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 blur-3xl"
          />
        </div>

        {/* Rotating Rings */}
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.05, 1] : isListening ? [1, 1.03, 1] : 1,
            rotate: isSpeaking ? 360 : isListening ? 180 : 0
          }}
          transition={{
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: isSpeaking ? 8 : 15, repeat: Infinity, ease: "linear" }
          }}
          className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border-2 border-purple-500/20"
        />

        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.08, 1] : isListening ? [1, 1.05, 1] : 1,
            rotate: isSpeaking ? -360 : isListening ? -180 : 0
          }}
          transition={{
            scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: isSpeaking ? 10 : 18, repeat: Infinity, ease: "linear" }
          }}
          className="absolute w-48 h-48 md:w-64 md:h-64 rounded-full border-2 border-blue-500/30"
        />

        {/* Main Orb */}
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.15, 1] : isListening ? [1, 1.08, 1] : [1, 1.02, 1],
            boxShadow: isSpeaking 
              ? [
                  '0 0 60px rgba(139, 92, 246, 0.6), 0 0 120px rgba(59, 130, 246, 0.4)',
                  '0 0 80px rgba(139, 92, 246, 0.8), 0 0 160px rgba(59, 130, 246, 0.6)',
                  '0 0 60px rgba(139, 92, 246, 0.6), 0 0 120px rgba(59, 130, 246, 0.4)'
                ]
              : isListening
                ? [
                    '0 0 40px rgba(59, 130, 246, 0.5), 0 0 80px rgba(139, 92, 246, 0.3)',
                    '0 0 60px rgba(59, 130, 246, 0.7), 0 0 120px rgba(139, 92, 246, 0.5)',
                    '0 0 40px rgba(59, 130, 246, 0.5), 0 0 80px rgba(139, 92, 246, 0.3)'
                  ]
                : '0 0 40px rgba(99, 102, 241, 0.3), 0 0 80px rgba(139, 92, 246, 0.2)'
          }}
          transition={{
            scale: { duration: isSpeaking ? 1.5 : isListening ? 2 : 3, repeat: Infinity, ease: "easeInOut" },
            boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="relative w-36 h-36 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 flex items-center justify-center cursor-pointer"
          onClick={hasStarted ? toggleListening : startDemo}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          role="button"
          aria-label={!hasStarted ? "Start voice demo" : isListening ? "Stop listening" : "Start speaking"}
        >
          {/* Inner Glow */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-400/50 to-purple-400/50 blur-xl" />
          
          {/* Icon */}
          <div className="relative z-10">
            {!hasStarted ? (
              <Phone className="w-16 h-16 md:w-20 md:h-20 text-white" aria-hidden="true" />
            ) : isListening ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Mic className="w-16 h-16 md:w-20 md:h-20 text-white" aria-hidden="true" />
              </motion.div>
            ) : isSpeaking ? (
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Volume2 className="w-16 h-16 md:w-20 md:h-20 text-white" aria-hidden="true" />
              </motion.div>
            ) : (
              <MicOff className="w-16 h-16 md:w-20 md:h-20 text-white/70" aria-hidden="true" />
            )}
          </div>

          {/* Pulse Effect When Active */}
          {(isSpeaking || isListening) && (
            <>
              <motion.div
                animate={{
                  scale: [1, 1.5],
                  opacity: [0.6, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className="absolute inset-0 rounded-full border-4 border-white/50"
              />
              <motion.div
                animate={{
                  scale: [1, 1.8],
                  opacity: [0.4, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5
                }}
                className="absolute inset-0 rounded-full border-4 border-white/30"
              />
            </>
          )}
        </motion.div>

        {/* Status Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          {!hasStarted ? (
            <>
              <h3 className="text-xl md:text-2xl font-bold mb-2">Click to Try</h3>
              <p className="text-gray-400 text-sm md:text-base">Experience real AI voice conversation</p>
            </>
          ) : isListening ? (
            <>
              <motion.h3
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-xl md:text-2xl font-bold mb-2 text-blue-400"
              >
                Listening...
              </motion.h3>
              <p className="text-gray-400 text-sm md:text-base">{transcript || 'Speak now'}</p>
            </>
          ) : isSpeaking ? (
            <>
              <motion.h3
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-xl md:text-2xl font-bold mb-2 text-purple-400"
              >
                AI Speaking...
              </motion.h3>
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <p className="text-gray-300 text-sm">Powered by GPT-4</p>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl md:text-2xl font-bold mb-2">Click to Speak</h3>
              <p className="text-gray-400 text-sm md:text-base">Tap the orb to continue</p>
            </>
          )}
        </motion.div>
      </div>

      {/* Compatibility Note */}
      {isDemo && (
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">💡 Requires Chrome or Edge browser</p>
        </div>
      )}
    </div>
  )
}

