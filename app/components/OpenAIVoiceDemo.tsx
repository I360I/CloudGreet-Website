'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface OpenAIVoiceDemoProps {
  businessName: string
  greetingMessage: string
}

export default function OpenAIVoiceDemo({ businessName, greetingMessage }: OpenAIVoiceDemoProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

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
  }, [])

  const playAudio = (audioBlob: Blob) => {
    const url = URL.createObjectURL(audioBlob)
    setAudioUrl(url)
    
    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.play()
      setIsSpeaking(true)
      
      audioRef.current.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
        setAudioUrl(null)
      }
    }
  }

  const handleUserInput = async (input: string) => {
    setIsProcessing(true)
    
    // Add user message to transcript
    setTranscript(prev => [...prev, `Customer: ${input}`])
    
    try {
      // Get real AI response with voice
      const response = await fetch('/api/ai/conversation-with-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: input,
          context: {
            businessName,
            greetingMessage,
            conversationType: 'demo',
            voice: 'alloy' // Use OpenAI voice
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const aiResponse = data.response
        setTranscript(prev => [...prev, `AI: ${aiResponse}`])
        
        // Play the AI voice response
        if (data.audioBlob) {
          // Convert base64 to blob
          const binaryString = atob(data.audioBlob)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })
          playAudio(audioBlob)
        }
      } else {
        throw new Error('AI API failed')
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      const fallbackResponse = "I'm sorry, I'm having trouble processing that. Could you please try again?"
      setTranscript(prev => [...prev, `AI: ${fallbackResponse}`])
      
      // Use browser speech synthesis as fallback
      const utterance = new SpeechSynthesisUtterance(fallbackResponse)
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      speechSynthesis.speak(utterance)
    } finally {
      setIsProcessing(false)
    }
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

  const startCall = async () => {
    setIsCallActive(true)
    setTranscript([])
    
    // Start with AI greeting using OpenAI voice
    try {
      const response = await fetch('/api/ai/conversation-with-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: 'start_call',
          context: {
            businessName,
            greetingMessage,
            conversationType: 'demo',
            voice: 'alloy'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const greeting = data.response || greetingMessage || `Hello! Thank you for calling ${businessName}. How can I help you today?`
        setTranscript([`AI: ${greeting}`])
        
        if (data.audioBlob) {
          // Convert base64 to blob
          const binaryString = atob(data.audioBlob)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })
          playAudio(audioBlob)
        }
      }
    } catch (error) {
      // Fallback to browser speech synthesis
      const greeting = greetingMessage || `Hello! Thank you for calling ${businessName}. How can I help you today?`
      setTranscript([`AI: ${greeting}`])
      
      const utterance = new SpeechSynthesisUtterance(greeting)
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      speechSynthesis.speak(utterance)
    }
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
    if (audioRef.current) {
      audioRef.current.pause()
    }
    speechSynthesis.cancel()
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">Real OpenAI Voice Demo</h2>
          <p className="text-gray-300">Experience actual AI conversations with OpenAI's voice technology</p>
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
              <span>Start Real AI Call</span>
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
                {isSpeaking ? 'AI Speaking (OpenAI Voice)' : 'AI Listening'}
              </span>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin mr-2" />
            <span className="text-blue-400">AI is thinking and generating voice...</span>
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
          <h3 className="text-white font-semibold mb-4">Real AI Conversation</h3>
          {transcript.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Start the demo call to begin the conversation with real OpenAI voice</p>
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
                    {message.startsWith('Customer:') ? 'Customer' : 'AI Receptionist (OpenAI Voice)'}
                  </p>
                  <p className="text-white">{message.split(': ')[1]}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Audio Element */}
        <audio ref={audioRef} className="hidden" />

        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            <strong>Real OpenAI Voice:</strong> This demo uses actual OpenAI voice generation, not browser speech synthesis. 
            Click "Start Real AI Call" then use the microphone to speak. The AI will respond with real OpenAI-generated voice!
          </p>
        </div>
      </div>
    </div>
  )
}
