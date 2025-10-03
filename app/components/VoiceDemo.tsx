'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface VoiceDemoProps {
  businessName: string
  greetingMessage: string
}

export default function VoiceDemo({ businessName, greetingMessage }: VoiceDemoProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis>(typeof window !== 'undefined' ? window.speechSynthesis : null)

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setCurrentMessage(finalTranscript)
          handleUserInput(finalTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
    }

    // Initialize speech synthesis
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = () => {
        // Voices loaded
      }
    }
  }, [])

  const speak = (text: string) => {
    if (!synthRef.current) return

    setIsSpeaking(true)
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 0.8

    // Try to use a natural voice
    const voices = synthRef.current.getVoices()
    const naturalVoice = voices.find((voice: any) => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.name.includes('Samantha') ||
      voice.name.includes('Alex')
    )
    if (naturalVoice) {
      utterance.voice = naturalVoice
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
    }

    synthRef.current.speak(utterance)
  }

  const handleUserInput = async (input: string) => {
    setIsProcessing(true)
    
    // Add user message to transcript
    setTranscript(prev => [...prev, `Customer: ${input}`])
    
    // Simulate AI processing and response
    setTimeout(() => {
      const response = generateAIResponse(input)
      setTranscript(prev => [...prev, `AI: ${response}`])
      speak(response)
      setIsProcessing(false)
    }, 1500)
  }

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase()
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return greetingMessage || `Hello! Thank you for calling ${businessName}. How can I help you today?`
    }
    
    if (lowerInput.includes('hvac') || lowerInput.includes('heating') || lowerInput.includes('cooling')) {
      return "I understand you need HVAC services. What specific issue are you experiencing? Is it heating, cooling, or both?"
    }
    
    if (lowerInput.includes('broken') || lowerInput.includes('not working') || lowerInput.includes('problem')) {
      return "I'm sorry to hear about the issue. Can you describe what's happening? Is it making unusual noises, not turning on, or something else?"
    }
    
    if (lowerInput.includes('emergency') || lowerInput.includes('urgent') || lowerInput.includes('asap')) {
      return "I understand this is urgent. We have emergency services available. Can you provide your address so I can check our service area?"
    }
    
    if (lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('how much')) {
      return "Our pricing varies based on the specific service needed. We offer free estimates for all jobs. Would you like me to schedule a technician to come out and provide a detailed quote?"
    }
    
    if (lowerInput.includes('schedule') || lowerInput.includes('appointment') || lowerInput.includes('when')) {
      return "I'd be happy to schedule an appointment for you. What's your preferred time? We have availability tomorrow morning or afternoon."
    }
    
    if (lowerInput.includes('address') || lowerInput.includes('location')) {
      return "Perfect! We do service that area. What's your full address so I can schedule the appointment?"
    }
    
    if (lowerInput.includes('thank') || lowerInput.includes('bye') || lowerInput.includes('goodbye')) {
      return "You're very welcome! Is there anything else I can help you with today?"
    }
    
    // Default response
    return "I understand. Let me help you with that. Can you provide a bit more detail so I can assist you better?"
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      setCurrentMessage('')
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false)
      recognitionRef.current.stop()
    }
  }

  const startCall = () => {
    setIsCallActive(true)
    setTranscript([])
    // Start with AI greeting
    setTimeout(() => {
      const greeting = greetingMessage || `Hello! Thank you for calling ${businessName}. How can I help you today?`
      setTranscript([`AI: ${greeting}`])
      speak(greeting)
    }, 1000)
  }

  const endCall = () => {
    setIsCallActive(false)
    setIsListening(false)
    setIsSpeaking(false)
    setTranscript([])
    setCurrentMessage('')
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (synthRef.current) {
      synthRef.current.cancel()
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">Live Voice Demo</h2>
          <p className="text-gray-300">Experience real conversation with your AI receptionist</p>
        </div>

        {/* Call Status */}
        <div className="flex items-center justify-center mb-8">
          {!isCallActive ? (
            <motion.button
              onClick={startCall}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full flex items-center space-x-3 text-lg font-semibold transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Phone className="w-6 h-6" />
              <span>Start Demo Call</span>
            </motion.button>
          ) : (
            <motion.button
              onClick={endCall}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full flex items-center space-x-3 text-lg font-semibold transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <PhoneOff className="w-6 h-6" />
              <span>End Call</span>
            </motion.button>
          )}
        </div>

        {/* Voice Controls */}
        {isCallActive && (
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className="flex items-center space-x-2">
              {!isListening ? (
                <motion.button
                  onClick={startListening}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Mic className="w-6 h-6" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={stopListening}
                  className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-colors animate-pulse"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <MicOff className="w-6 h-6" />
                </motion.button>
              )}
              <span className="text-white text-sm">
                {isListening ? 'Listening...' : 'Click to speak'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {isSpeaking ? (
                <div className="bg-green-600 text-white p-3 rounded-full animate-pulse">
                  <Volume2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="bg-gray-600 text-white p-3 rounded-full">
                  <VolumeX className="w-6 h-6" />
                </div>
              )}
              <span className="text-white text-sm">
                {isSpeaking ? 'AI Speaking' : 'AI Listening'}
              </span>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin mr-2" />
            <span className="text-blue-400">AI is thinking...</span>
          </div>
        )}

        {/* Current Message */}
        {currentMessage && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
            <p className="text-blue-300 text-sm mb-1">You said:</p>
            <p className="text-white">{currentMessage}</p>
          </div>
        )}

        {/* Transcript */}
        <div className="bg-black/20 rounded-lg p-6 max-h-96 overflow-y-auto">
          <h3 className="text-white font-semibold mb-4">Conversation Transcript</h3>
          {transcript.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Start the demo call to begin the conversation</p>
          ) : (
            <div className="space-y-4">
              {transcript.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg ${
                    message.startsWith('Customer:')
                      ? 'bg-blue-500/20 border border-blue-500/30 ml-8'
                      : 'bg-purple-500/20 border border-purple-500/30 mr-8'
                  }`}
                >
                  <p className={`text-sm font-medium mb-1 ${
                    message.startsWith('Customer:') ? 'text-blue-300' : 'text-purple-300'
                  }`}>
                    {message.startsWith('Customer:') ? 'Customer' : 'AI Receptionist'}
                  </p>
                  <p className="text-white">{message.split(': ')[1]}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            <strong>How to use:</strong> Click "Start Demo Call" then use the microphone button to speak. 
            The AI will respond with voice and text. Try asking about HVAC services, scheduling, or pricing!
          </p>
        </div>
      </div>
    </div>
  )
}
