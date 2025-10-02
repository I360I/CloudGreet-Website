'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Settings, Home, User, Phone, CreditCard } from 'lucide-react'

interface VoiceCommandsProps {
  enabled?: boolean
  onCommand?: (command: string, confidence: number) => void
  children?: React.ReactNode
}

// Type definitions for browser APIs
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface VoiceCommand {
  phrase: string
  action: () => void
  description: string
  icon: React.ComponentType<any>
  confidence: number
}

export default function VoiceCommands({ enabled = true, onCommand, children }: VoiceCommandsProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [showCommands, setShowCommands] = useState(false)
  const [lastCommand, setLastCommand] = useState<string | null>(null)
  
  const recognitionRef = useRef<any | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null)

  // Voice commands configuration
  const voiceCommands: VoiceCommand[] = [
    {
      phrase: 'go home',
      action: () => window.location.href = '/',
      description: 'Navigate to home page',
      icon: Home,
      confidence: 0.9
    },
    {
      phrase: 'go to dashboard',
      action: () => window.location.href = '/dashboard',
      description: 'Navigate to dashboard',
      icon: User,
      confidence: 0.9
    },
    {
      phrase: 'test agent',
      action: () => window.location.href = '/test-agent',
      description: 'Test AI agent',
      icon: Phone,
      confidence: 0.9
    },
    {
      phrase: 'go to billing',
      action: () => window.location.href = '/billing',
      description: 'Navigate to billing',
      icon: CreditCard,
      confidence: 0.9
    },
    {
      phrase: 'go to settings',
      action: () => window.location.href = '/settings',
      description: 'Navigate to settings',
      icon: Settings,
      confidence: 0.9
    },
    {
      phrase: 'scroll down',
      action: () => window.scrollBy(0, window.innerHeight),
      description: 'Scroll down',
      icon: Volume2,
      confidence: 0.8
    },
    {
      phrase: 'scroll up',
      action: () => window.scrollBy(0, -window.innerHeight),
      description: 'Scroll up',
      icon: VolumeX,
      confidence: 0.8
    },
    {
      phrase: 'show commands',
      action: () => setShowCommands(true),
      description: 'Show available voice commands',
      icon: Mic,
      confidence: 0.9
    },
    {
      phrase: 'hide commands',
      action: () => setShowCommands(false),
      description: 'Hide voice commands panel',
      icon: MicOff,
      confidence: 0.9
    }
  ]

  // Initialize speech recognition
  useEffect(() => {
    if (!enabled) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const SpeechSynthesis = window.speechSynthesis

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported')
      return
    }

    setIsSupported(true)
    speechSynthesisRef.current = SpeechSynthesis

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 3

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('')
      setConfidence(0)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''
      let maxConfidence = 0

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence || 0
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript
          maxConfidence = Math.max(maxConfidence, confidence)
        } else {
          interimTranscript += transcript
        }
      }

      setTranscript(finalTranscript || interimTranscript)
      setConfidence(maxConfidence)

      if (finalTranscript) {
        processVoiceCommand(finalTranscript.toLowerCase().trim(), maxConfidence)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      
      if (event.error === 'not-allowed') {
        speak('Microphone access denied. Please enable microphone permissions.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [enabled])

  // Process voice commands
  const processVoiceCommand = useCallback((command: string, confidence: number) => {
    const matchedCommand = voiceCommands.find(cmd => 
      command.includes(cmd.phrase.toLowerCase()) && confidence >= 0.5
    )

    if (matchedCommand && confidence >= matchedCommand.confidence) {
      setLastCommand(command)
      onCommand?.(command, confidence)
      
      // Provide audio feedback
      speak(`Executing: ${matchedCommand.description}`)
      
      // Execute the command
      setTimeout(() => {
        matchedCommand.action()
      }, 500)
    } else {
      speak('Command not recognized. Say "show commands" for help.')
    }
  }, [voiceCommands, onCommand])

  // Text-to-speech function
  const speak = useCallback((text: string) => {
    if (!speechSynthesisRef.current || isMuted) return

    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    // Try to use a natural voice
    const voices = speechSynthesisRef.current.getVoices()
    const naturalVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Natural')
    ) || voices.find(voice => voice.lang.startsWith('en'))

    if (naturalVoice) {
      utterance.voice = naturalVoice
    }

    speechSynthesisRef.current.speak(utterance)
  }, [isMuted])

  // Start/stop listening
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) return

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      try {
        recognitionRef.current.start()
        speak('Listening...')
      } catch (error) {
        console.error('Failed to start speech recognition:', error)
        speak('Failed to start listening. Please try again.')
      }
    }
  }, [isListening, isSupported, speak])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
    if (!isMuted) {
      speechSynthesisRef.current?.cancel()
    }
  }, [isMuted])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'm':
            event.preventDefault()
            toggleListening()
            break
          case 'v':
            event.preventDefault()
            toggleMute()
            break
          case 'h':
            event.preventDefault()
            setShowCommands(!showCommands)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [toggleListening, toggleMute, showCommands])

  if (!enabled || !isSupported) {
    return null
  }

  return (
    <>
      {children}
      {/* Voice Control Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleListening}
        className={`fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center z-50 transition-all duration-300 ${
          isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
        } ${isMuted ? 'opacity-50' : ''}`}
        title={`${isListening ? 'Stop' : 'Start'} voice commands (Ctrl+M)`}
      >
        {isListening ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </motion.button>

      {/* Mute Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleMute}
        className={`fixed bottom-20 right-20 w-12 h-12 rounded-full flex items-center justify-center z-50 transition-all duration-300 ${
          isMuted ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-500 hover:bg-green-600'
        }`}
        title={`${isMuted ? 'Unmute' : 'Mute'} voice feedback (Ctrl+V)`}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </motion.button>

      {/* Transcript Display */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 right-4 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 max-w-xs z-50"
          >
            <div className="text-white text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/70 text-xs">Voice Command:</span>
                <span className="text-white/70 text-xs">{Math.round(confidence * 100)}%</span>
              </div>
              <p className="font-medium">{transcript}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last Command Feedback */}
      <AnimatePresence>
        {lastCommand && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 right-4 bg-green-500/20 border border-green-500/30 rounded-lg p-3 z-50"
          >
            <div className="text-green-400 text-sm flex items-center space-x-2">
              <Mic className="w-4 h-4" />
              <span>Executed: &quot;{lastCommand}&quot;</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Commands Help Panel */}
      <AnimatePresence>
        {showCommands && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-black/90 backdrop-blur-sm border border-white/20 rounded-xl p-6 max-w-sm z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
                <Mic className="w-5 h-5 text-blue-400" />
                <span>Voice Commands</span>
              </h3>
              <button
                onClick={() => setShowCommands(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {voiceCommands.map((command, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 bg-white/10 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <command.icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm">
                        &quot;{command.phrase}&quot;
                      </h4>
                      <p className="text-white/70 text-xs mt-1">
                        {command.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="text-white/60 text-xs space-y-1">
                <p><strong>Keyboard Shortcuts:</strong></p>
                <p>Ctrl+M - Toggle listening</p>
                <p>Ctrl+V - Toggle mute</p>
                <p>Ctrl+H - Show/hide commands</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed inset-0 pointer-events-none z-40"
          >
            <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-32 h-32 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
