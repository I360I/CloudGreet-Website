"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Sparkles } from 'lucide-react'

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
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

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

      // Initialize Audio Context for audio analysis
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Draw flowing waves around the orb
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const baseRadius = 120
    let time = 0

    const drawWaves = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw multiple wave rings around the orb
      const numWaves = 5
      for (let i = 0; i < numWaves; i++) {
        const waveOffset = (i / numWaves) * Math.PI * 2
        const radiusOffset = i * 15
        
        ctx.beginPath()
        
        for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
          // Create flowing wave effect
          const wave1 = Math.sin(angle * 3 + time + waveOffset) * 8
          const wave2 = Math.sin(angle * 5 - time * 1.5 + waveOffset) * 5
          const audioWave = isSpeaking ? Math.sin(angle * 2 + time * 3) * audioLevel * 15 : 0
          
          const radius = baseRadius + radiusOffset + wave1 + wave2 + audioWave
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          
          if (angle === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        
        ctx.closePath()
        
        // Color gradient based on state
        const hue = isSpeaking ? 280 + i * 10 : isListening ? 220 + i * 10 : 260 + i * 10
        const alpha = 0.3 - i * 0.04
        const glowIntensity = isSpeaking ? 0.8 : isListening ? 0.6 : 0.4
        
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`
        ctx.lineWidth = 2
        ctx.shadowBlur = 20 * glowIntensity
        ctx.shadowColor = `hsla(${hue}, 80%, 60%, ${glowIntensity})`
        ctx.stroke()
      }

      time += 0.02
      animationFrameRef.current = requestAnimationFrame(drawWaves)
    }

    drawWaves()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isSpeaking, isListening, audioLevel])

  const playAudioFromText = async (text: string) => {
    try {
      setIsSpeaking(true)
      setError(null)
      
      const response = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voice: 'nova'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Voice API failed')
      }

      const audioBlob = await response.blob()
      
      if (audioBlob.type === 'application/json') {
        throw new Error('API returned error instead of audio')
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      
      audioRef.current = new Audio(audioUrl)
      
      // Connect audio to analyser for visualization
      if (audioContextRef.current && audioRef.current) {
        try {
          const source = audioContextRef.current.createMediaElementSource(audioRef.current)
          analyserRef.current = audioContextRef.current.createAnalyser()
          analyserRef.current.fftSize = 256
          source.connect(analyserRef.current)
          analyserRef.current.connect(audioContextRef.current.destination)
          
          // Update audio level for visualization
          const updateAudioLevel = () => {
            if (analyserRef.current && isSpeaking) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
              analyserRef.current.getByteFrequencyData(dataArray)
              const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255
              setAudioLevel(avg)
              requestAnimationFrame(updateAudioLevel)
            }
          }
          updateAudioLevel()
        } catch (e) {
          // Fallback if audio context fails
        }
      }
      
      audioRef.current.onended = () => {
        setIsSpeaking(false)
        setAudioLevel(0)
        URL.revokeObjectURL(audioUrl)
      }
      audioRef.current.onerror = () => {
        setIsSpeaking(false)
        setAudioLevel(0)
        setError('Audio playback failed')
        URL.revokeObjectURL(audioUrl)
      }

      await audioRef.current.play()
    } catch (error: any) {
      console.error('Audio playback error:', error)
      setIsSpeaking(false)
      setAudioLevel(0)
      setError(error.message || 'Voice system unavailable')
    }
  }

  const processUserSpeech = async (userText: string) => {
    if (!userText.trim()) return

    setTranscript('')
    setIsProcessing(true)

    try {
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: userText }
      ]

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

      setConversationHistory([
        ...newHistory,
        { role: 'assistant', content: aiResponse }
      ])

      setIsProcessing(false)
      await playAudioFromText(aiResponse)

    } catch (error) {
      console.error('Conversation error:', error)
      setIsProcessing(false)
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
    const greeting = `Hey there! Thanks for trying CloudGreet. I'm your AI receptionist. How can I help you today?`
    setConversationHistory([{ role: 'assistant', content: greeting }])
    await playAudioFromText(greeting)
  }

  const isActive = isListening || isSpeaking || isProcessing

  return (
    <div className="relative w-full">
      {/* Canvas for flowing waves */}
      <div className="relative w-full h-[500px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="absolute"
          style={{ filter: 'blur(0.5px)' }}
        />

        {/* Dark Orb Center (Ring movie style) */}
        <motion.div
          className="relative z-10 w-48 h-48 rounded-full bg-gradient-to-br from-black via-slate-950 to-black cursor-pointer overflow-hidden"
          onClick={hasStarted ? (isProcessing || isSpeaking ? undefined : toggleListening) : startDemo}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: isActive
              ? [
                  '0 0 60px rgba(139, 92, 246, 0.6), inset 0 0 40px rgba(139, 92, 246, 0.2)',
                  '0 0 80px rgba(139, 92, 246, 0.8), inset 0 0 60px rgba(139, 92, 246, 0.3)',
                  '0 0 60px rgba(139, 92, 246, 0.6), inset 0 0 40px rgba(139, 92, 246, 0.2)',
                ]
              : '0 0 40px rgba(99, 102, 241, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.8)'
          }}
          transition={{
            boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* Inner dark void */}
          <div className="absolute inset-8 rounded-full bg-black" />
          
          {/* Subtle inner glow when active */}
          {isActive && (
            <motion.div
              animate={{
                opacity: [0.1, 0.3, 0.1],
                scale: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-purple-600/20 blur-xl"
            />
          )}

          {/* Minimal icon - small and subtle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.6, rotate: 360 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" } }}
                >
                  <Sparkles className="w-8 h-8 text-purple-400/60" />
                </motion.div>
              ) : isListening ? (
                <motion.div
                  key="mic"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.6 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <Mic className="w-8 h-8 text-blue-400/60" />
                </motion.div>
              ) : isSpeaking ? (
                <motion.div
                  key="volume"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: 0.6 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ scale: { duration: 1, repeat: Infinity } }}
                >
                  <Volume2 className="w-8 h-8 text-purple-400/60" />
                </motion.div>
              ) : hasStarted ? (
                <motion.div
                  key="micoff"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.4 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <MicOff className="w-6 h-6 text-gray-500/60" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Status Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mt-8"
      >
        <AnimatePresence mode="wait">
          {!hasStarted ? (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Click the Dark Orb
              </h3>
              <p className="text-gray-400 text-base md:text-lg">Watch the glowing waves react to the AI's voice</p>
            </motion.div>
          ) : isProcessing ? (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 text-purple-400">Thinking...</h3>
              <p className="text-gray-300 text-base">AI is crafting a response</p>
            </motion.div>
          ) : isListening ? (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 text-blue-400">I'm Listening</h3>
              <p className="text-gray-300 text-base md:text-lg">{transcript || 'Speak naturally...'}</p>
            </motion.div>
          ) : isSpeaking ? (
            <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Speaking...
              </h3>
              <p className="text-gray-300 text-base">Waves pulsing with voice</p>
            </motion.div>
          ) : (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 text-white">Your Turn</h3>
              <p className="text-gray-400 text-base md:text-lg">Click the orb to speak</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center max-w-md mx-auto"
        >
          <p className="text-red-400 text-sm font-medium mb-1">Voice API Error</p>
          <p className="text-red-300 text-xs">{error}</p>
        </motion.div>
      )}

      {/* Compatibility Note */}
      {isDemo && !error && (
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            🎙️ OpenAI TTS HD 'nova' voice | Waves react to speech | Best in Chrome/Edge/Safari
          </p>
        </div>
      )}
    </div>
  )
}
