"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX, Sparkles, Phone } from 'lucide-react'
import Link from 'next/link'

export default function TestAgentSimplePage() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [conversationHistory, setConversationHistory] = useState<{role: string, content: string}[]>([])
  const [businessInfo, setBusinessInfo] = useState({
    businessName: 'Your Business',
    greetingMessage: 'Hello! Thank you for calling. How can I help you today?'
  })
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize speech synthesis and recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis
      
      // Load business info
      const token = localStorage.getItem('token')
      if (token) {
        fetch('/api/business/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setBusinessInfo({
                businessName: data.data.businessName || 'Your Business',
                greetingMessage: data.data.greetingMessage || 'Hello! Thank you for calling. How can I help you today?'
              })
            }
          })
          .catch(err => {
            console.error('Failed to load business info:', err)
            setError('Failed to load business info')
          })
      }

      // Initialize Web Speech API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex
          const transcript = event.results[current][0].transcript
          setTranscript(transcript)

          if (event.results[current].isFinal) {
            processUserSpeech(transcript)
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
          setError(`Speech recognition error: ${event.error}. Please check microphone permissions.`)
          setTimeout(() => setError(null), 5000)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationHistory])

  const processUserSpeech = async (userText: string) => {
    if (!userText.trim()) return

    const userMessage = { role: 'user', content: userText }
    setConversationHistory(prev => [...prev, userMessage])
    setTranscript('')
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/conversation-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...conversationHistory, userMessage],
          businessName: businessInfo.businessName,
          businessType: 'Your Business',
          services: 'Your services',
          hours: '24/7'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const aiText = data.response || data.aiResponse || 'I apologize, could you repeat that?'
        
        setAiResponse(aiText)
        setConversationHistory(prev => [...prev, { role: 'assistant', content: aiText }])
        setIsProcessing(false)

        // Speak the response if audio is enabled
        if (audioEnabled && synthRef.current) {
          speakText(aiText)
        }
      } else {
        throw new Error('Failed to get AI response')
      }
    } catch (error) {
      const errorMsg = 'Sorry, I encountered an error. Please try again.'
      setAiResponse(errorMsg)
      setConversationHistory(prev => [...prev, { role: 'assistant', content: errorMsg }])
      setIsProcessing(false)
      setError('AI response failed. Check your connection.')
      setTimeout(() => setError(null), 5000)
      
      if (audioEnabled && synthRef.current) {
        speakText(errorMsg)
      }
    }
  }

  const speakText = (text: string) => {
    if (!synthRef.current || !audioEnabled) return

    // Cancel any ongoing speech
    synthRef.current.cancel()

    setIsSpeaking(true)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to use a natural voice
    const voices = synthRef.current.getVoices()
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Natural') ||
      voice.name.includes('Premium')
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
    }

    synthRef.current.speak(utterance)
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setIsListening(true)
      recognitionRef.current.start()
      
      if (!hasStarted) {
        setHasStarted(true)
        // Speak greeting
        if (audioEnabled) {
          speakText(businessInfo.greetingMessage)
        }
      }
    }
  }

  const startConversation = () => {
    setHasStarted(true)
    setConversationHistory([])
    setTranscript('')
    setAiResponse('')
    
    // Speak greeting
    if (audioEnabled) {
      speakText(businessInfo.greetingMessage)
    }
    setConversationHistory([{ role: 'assistant', content: businessInfo.greetingMessage }])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(147,51,234,0.15)_0%,transparent_50%)]" />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          
          <div className="flex items-center gap-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}
            
            <motion.button
              onClick={() => setAudioEnabled(!audioEnabled)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
              aria-label={audioEnabled ? 'Mute audio' : 'Unmute audio'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="text-sm">{audioEnabled ? 'Audio On' : 'Audio Off'}</span>
            </motion.button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Business Info */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-purple-300">
              Test Your AI Agent
            </h1>
            <p className="text-xl text-gray-300 mb-2">Speak naturally with your AI receptionist</p>
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm">Powered by GPT-4 • Real Voice AI</span>
            </div>
          </motion.div>

          {/* Main Voice Interface */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Glowing Orb Container */}
            <div className="flex flex-col items-center justify-center py-16 relative">
              {/* Glow Effects */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: isSpeaking ? [1, 1.3, 1] : isListening ? [1, 1.15, 1] : 1,
                    opacity: isSpeaking ? [0.3, 0.6, 0.3] : isListening ? [0.2, 0.4, 0.2] : 0.15
                  }}
                  transition={{
                    duration: isSpeaking ? 1.5 : isListening ? 2 : 3,
                    repeat: (isSpeaking || isListening) ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                  className="w-96 h-96 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 blur-3xl"
                />
              </div>

              {/* Outer Ring */}
              <motion.div
                animate={{
                  scale: isSpeaking ? [1, 1.05, 1] : isListening ? [1, 1.03, 1] : 1,
                  rotate: isSpeaking ? 360 : isListening ? 180 : 0
                }}
                transition={{
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: isSpeaking ? 8 : 15, repeat: Infinity, ease: "linear" }
                }}
                className="absolute w-80 h-80 rounded-full border-2 border-purple-500/20"
              />

              {/* Middle Ring */}
              <motion.div
                animate={{
                  scale: isSpeaking ? [1, 1.08, 1] : isListening ? [1, 1.05, 1] : 1,
                  rotate: isSpeaking ? -360 : isListening ? -180 : 0
                }}
                transition={{
                  scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: isSpeaking ? 10 : 18, repeat: Infinity, ease: "linear" }
                }}
                className="absolute w-64 h-64 rounded-full border-2 border-blue-500/30"
              />

              {/* Main Orb */}
              <motion.div
                animate={{
                  scale: isSpeaking ? [1, 1.15, 1] : isListening ? [1, 1.08, 1] : isProcessing ? [1, 1.05, 1] : 1,
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
                      : isProcessing
                        ? [
                            '0 0 30px rgba(168, 85, 247, 0.4), 0 0 60px rgba(99, 102, 241, 0.3)',
                            '0 0 50px rgba(168, 85, 247, 0.6), 0 0 100px rgba(99, 102, 241, 0.4)',
                            '0 0 30px rgba(168, 85, 247, 0.4), 0 0 60px rgba(99, 102, 241, 0.3)'
                          ]
                        : '0 0 40px rgba(99, 102, 241, 0.3), 0 0 80px rgba(139, 92, 246, 0.2)'
                }}
                transition={{
                  scale: { duration: isProcessing ? 1 : 1.5, repeat: Infinity, ease: "easeInOut" },
                  boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                className="relative w-48 h-48 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 flex items-center justify-center cursor-pointer"
                onClick={hasStarted ? toggleListening : startConversation}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Inner Glow */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-400/50 to-purple-400/50 blur-xl" />
                
                {/* Icon */}
                <div className="relative z-10">
                  {!hasStarted ? (
                    <Phone className="w-20 h-20 text-white" />
                  ) : isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-20 h-20 text-white" />
                    </motion.div>
                  ) : isListening ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      <Mic className="w-20 h-20 text-white" />
                    </motion.div>
                  ) : isSpeaking ? (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Volume2 className="w-20 h-20 text-white" />
                    </motion.div>
                  ) : (
                    <MicOff className="w-20 h-20 text-white/70" />
                  )}
                </div>

                {/* Pulse Effect */}
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
                    <h3 className="text-2xl font-bold mb-2">Click to Start</h3>
                    <p className="text-gray-400">Talk to your AI receptionist with real voice</p>
                  </>
                ) : isProcessing ? (
                  <>
                    <motion.h3
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-2xl font-bold mb-2 text-purple-300"
                    >
                      Thinking...
                    </motion.h3>
                    <p className="text-gray-400">AI is processing your request</p>
                  </>
                ) : isListening ? (
                  <>
                    <motion.h3
                      animate={{ opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-2xl font-bold mb-2 text-blue-400"
                    >
                      Listening...
                    </motion.h3>
                    <p className="text-gray-400">{transcript || 'Speak now'}</p>
                  </>
                ) : isSpeaking ? (
                  <>
                    <motion.h3
                      animate={{ opacity: [1, 0.7, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-2xl font-bold mb-2 text-purple-400"
                    >
                      AI Speaking...
                    </motion.h3>
                    <p className="text-gray-300 max-w-lg mx-auto">{aiResponse}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold mb-2">Click to Speak</h3>
                    <p className="text-gray-400">Tap the orb to start talking</p>
                  </>
                )}
              </motion.div>
            </div>

            {/* Conversation History */}
            {conversationHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-h-96 overflow-y-auto"
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-400" />
                  Conversation Transcript
                </h3>
                <div className="space-y-3">
                  {conversationHistory.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] px-4 py-2 rounded-xl ${
                        msg.role === 'user'
                          ? 'bg-blue-600/30 border border-blue-500/50 text-blue-100'
                          : 'bg-purple-600/20 border border-purple-500/40 text-purple-100'
                      }`}>
                        <div className="text-xs font-semibold mb-1 opacity-70">
                          {msg.role === 'user' ? 'You' : businessInfo.businessName}
                        </div>
                        <div className="text-sm">{msg.content}</div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            {hasStarted && (
              <div className="mt-8 flex gap-4 justify-center">
                <motion.button
                  onClick={() => {
                    setHasStarted(false)
                    setConversationHistory([])
                    setTranscript('')
                    setAiResponse('')
                    if (synthRef.current) synthRef.current.cancel()
                    if (recognitionRef.current) recognitionRef.current.stop()
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/20"
                >
                  Start Over
                </motion.button>

                <Link href="/billing">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-green-500/20"
                  >
                    🎉 Perfect! Subscribe & Go Live
                  </motion.button>
                </Link>
              </div>
            )}

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-12 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-2xl p-6"
            >
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                How to Test
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-400">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-white mb-1">Click the glowing orb</p>
                    <p className="text-gray-400">Start the conversation and listen to the greeting</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-purple-400">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-white mb-1">Speak naturally</p>
                    <p className="text-gray-400">Click again to respond - talk like a real customer</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-400">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-white mb-1">Test different scenarios</p>
                    <p className="text-gray-400">Try booking, pricing, emergencies, objections</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-purple-400">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-white mb-1">Verify personality</p>
                    <p className="text-gray-400">Check if the tone matches your brand</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Browser Compatibility Note */}
            <div className="mt-6 text-center text-xs text-gray-500">
              <p>💡 For best experience, use Chrome or Edge browser</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
