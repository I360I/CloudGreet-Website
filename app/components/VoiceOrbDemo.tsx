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

        recognitionRef.current.onerror = () => setIsListening(false)
        recognitionRef.current.onend = () => setIsListening(false)
      }

      audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioContextRef.current) audioContextRef.current.close()
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Draw EXACT hero-style waves around the orb
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const baseRadius = 120
    let time = 0

    // Electric purple colors from hero
    const purpleColors = ['#8B5CF6', '#A855F7', '#9333EA', '#C084FC', '#A78BFA']

    const drawWaves = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'screen' // Screen blend like hero

      const numWaves = 8
      for (let i = 0; i < numWaves; i++) {
        const color = purpleColors[i % purpleColors.length]
        const radiusOffset = i * 12
        const phaseOffset = (i / numWaves) * Math.PI * 2
        const frequency = 0.015 + (i * 0.002)
        const amplitude = 15 + (i * 2)
        
        // Audio reactive amplitude
        const audioBoost = isSpeaking ? audioLevel * 25 : 0
        const finalAmplitude = amplitude + audioBoost

        ctx.beginPath()
        
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
          // EXACT hero wave formula - sine waves with frequency
          const baseWave = Math.sin((angle * 15) + time + phaseOffset) * finalAmplitude
          const secondaryWave = Math.sin((angle * 22.5) + time * 1.2 + phaseOffset) * finalAmplitude * 0.2
          
          const radius = baseRadius + radiusOffset + baseWave + secondaryWave
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          
          if (angle === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        
        ctx.closePath()
        
        // Dynamic opacity based on state
        const baseOpacity = 0.5 - (i * 0.04)
        const pulse = Math.sin(time + phaseOffset) * 0.2 + 0.8
        const opacity = baseOpacity * pulse * (isSpeaking ? 1.2 : 1)
        
        // Create gradient like hero (transparent → opaque → transparent)
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius - 30, centerX, centerY, baseRadius + radiusOffset + 60)
        gradient.addColorStop(0, `${color}00`)
        gradient.addColorStop(0.3, `${color}${Math.floor(opacity * 0.3 * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(0.6, `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(1, `${color}00`)
        
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2 + (isSpeaking ? 0.5 : 0)
        ctx.lineCap = 'round'
        ctx.shadowColor = color
        ctx.shadowBlur = 12
        ctx.stroke()
        
        // Add glow layer like hero
        ctx.strokeStyle = `${color}${Math.floor(opacity * 0.2 * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 3.6
        ctx.shadowBlur = 12
        ctx.stroke()
      }

      time += 0.008
      animationFrameRef.current = requestAnimationFrame(drawWaves)
    }

    drawWaves()

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isSpeaking, audioLevel])

  const playAudioFromText = async (text: string) => {
    try {
      setIsSpeaking(true)
      setError(null)
      
      const response = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Voice API failed')
      }

      const audioBlob = await response.blob()
      if (audioBlob.type === 'application/json') throw new Error('API returned error')

      const audioUrl = URL.createObjectURL(audioBlob)
      audioRef.current = new Audio(audioUrl)
      
      // Audio analysis for wave reactivity
      if (audioContextRef.current && audioRef.current) {
        try {
          const source = audioContextRef.current.createMediaElementSource(audioRef.current)
          analyserRef.current = audioContextRef.current.createAnalyser()
          analyserRef.current.fftSize = 256
          source.connect(analyserRef.current)
          analyserRef.current.connect(audioContextRef.current.destination)
          
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
        } catch (e) {}
      }
      
      audioRef.current.onended = () => {
        setIsSpeaking(false)
        setAudioLevel(0)
        URL.revokeObjectURL(audioUrl)
      }
      audioRef.current.onerror = () => {
        setIsSpeaking(false)
        setAudioLevel(0)
        URL.revokeObjectURL(audioUrl)
      }

      await audioRef.current.play()
    } catch (error: any) {
      setIsSpeaking(false)
      setAudioLevel(0)
      setError(error.message || 'Voice unavailable')
    }
  }

  const processUserSpeech = async (userText: string) => {
    if (!userText.trim()) return

    setTranscript('')
    setIsProcessing(true)

    try {
      const newHistory = [...conversationHistory, { role: 'user', content: userText }]
      const response = await fetch('/api/ai/conversation-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, businessName })
      })

      if (!response.ok) throw new Error('Conversation failed')
      
      const data = await response.json()
      const aiResponse = data.response

      setConversationHistory([...newHistory, { role: 'assistant', content: aiResponse }])
      setIsProcessing(false)
      await playAudioFromText(aiResponse)
    } catch (error) {
      setIsProcessing(false)
      await playAudioFromText("Sorry, could you say that again?")
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice requires Chrome, Edge, or Safari')
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
    const greeting = `Hey there! Thanks for trying CloudGreet. I'm your AI receptionist. What can I help you with today?`
    setConversationHistory([{ role: 'assistant', content: greeting }])
    await playAudioFromText(greeting)
  }

  return (
    <div className="relative w-full">
      {/* Canvas for hero-style waves */}
      <div className="relative w-full h-[500px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          className="absolute"
        />

        {/* Dark Orb Center */}
        <motion.div
          className="relative z-10 w-48 h-48 rounded-full bg-gradient-to-br from-black via-slate-950 to-black cursor-pointer overflow-hidden"
          onClick={hasStarted ? (isProcessing || isSpeaking ? undefined : toggleListening) : startDemo}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              '0 0 40px rgba(139, 92, 246, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.9)',
              '0 0 60px rgba(139, 92, 246, 0.6), inset 0 0 40px rgba(0, 0, 0, 0.9)',
              '0 0 40px rgba(139, 92, 246, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.9)',
            ]
          }}
          transition={{ boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
        >
          {/* Inner void */}
          <div className="absolute inset-8 rounded-full bg-black" />
          
          {/* Subtle glow when active */}
          {(isListening || isSpeaking || isProcessing) && (
            <motion.div
              animate={{ opacity: [0.1, 0.3, 0.1], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-purple-600/20 blur-xl"
            />
          )}

          {/* Small subtle icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div key="processing" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 0.6, rotate: 360 }} exit={{ scale: 0, opacity: 0 }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" } }}>
                  <Sparkles className="w-8 h-8 text-purple-400/60" />
                </motion.div>
              ) : isListening ? (
                <motion.div key="mic" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 0.6 }} exit={{ scale: 0, opacity: 0 }}>
                  <Mic className="w-8 h-8 text-blue-400/60" />
                </motion.div>
              ) : isSpeaking ? (
                <motion.div key="volume" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [1, 1.2, 1], opacity: 0.6 }} exit={{ scale: 0, opacity: 0 }} transition={{ scale: { duration: 1, repeat: Infinity } }}>
                  <Volume2 className="w-8 h-8 text-purple-400/60" />
                </motion.div>
              ) : hasStarted ? (
                <motion.div key="micoff" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 0.4 }} exit={{ scale: 0, opacity: 0 }}>
                  <MicOff className="w-6 h-6 text-gray-500/60" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Status Text */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-8">
        <AnimatePresence mode="wait">
          {!hasStarted ? (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Click to Talk
              </h3>
              <p className="text-gray-400 text-base md:text-lg">Have a real conversation with AI</p>
            </motion.div>
          ) : isProcessing ? (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 text-purple-400">One moment...</h3>
            </motion.div>
          ) : isListening ? (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 text-blue-400">Listening</h3>
              <p className="text-gray-300 text-base md:text-lg">{transcript || 'Say something...'}</p>
            </motion.div>
          ) : isSpeaking ? (
            <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Speaking
              </h3>
            </motion.div>
          ) : (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 text-white">Your turn</h3>
              <p className="text-gray-400 text-base md:text-lg">Click to continue</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center max-w-md mx-auto">
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}
    </div>
  )
}
