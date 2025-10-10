"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Sparkles, Settings, AlertCircle } from 'lucide-react'

interface VoiceOrbDemoProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
  isDemo?: boolean
}

export default function VoiceOrbDemo({ 
  businessName = 'CloudGreet', 
  businessType = 'AI Receptionist Service',
  services = 'AI phone answering, appointment scheduling, customer support',
  hours = '24/7',
  isDemo = true 
}: VoiceOrbDemoProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [hasStarted, setHasStarted] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [voiceStatus, setVoiceStatus] = useState<'openai' | 'error' | 'checking'>('checking')
  const [selectedVoice, setSelectedVoice] = useState('nova')
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking')
  const [showSettings, setShowSettings] = useState(false)
  
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check microphone permission
      checkMicrophonePermission()
      
      audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
      
      // Test OpenAI TTS availability on startup
      testVoiceAPI()
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

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setMicPermission(result.state as any)
      
      result.onchange = () => {
        setMicPermission(result.state as any)
      }
    } catch (e) {
      setMicPermission('prompt')
    }
  }

  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      setMicPermission('granted')
      
      // Initialize speech recognition after permission granted
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
      
      return true
    } catch (error) {
      setMicPermission('denied')
      setError('Microphone access denied. Please allow microphone in your browser settings.')
      return false
    }
  }

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
      ctx.globalCompositeOperation = 'screen'

      const numWaves = 8
      for (let i = 0; i < numWaves; i++) {
        const color = purpleColors[i % purpleColors.length]
        const radiusOffset = i * 12
        const phaseOffset = (i / numWaves) * Math.PI * 2
        const frequency = 0.015 + (i * 0.002)
        const amplitude = 15 + (i * 2)
        
        const audioBoost = isSpeaking ? audioLevel * 25 : 0
        const finalAmplitude = amplitude + audioBoost

        ctx.beginPath()
        
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
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
        
        const baseOpacity = 0.5 - (i * 0.04)
        const pulse = Math.sin(time + phaseOffset) * 0.2 + 0.8
        const opacity = baseOpacity * pulse * (isSpeaking ? 1.2 : 1)
        
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius - 30, centerX, centerY, baseRadius + radiusOffset + 60)
        gradient.addColorStop(0, `${color}00`)
        gradient.addColorStop(0.3, `${color}${Math.floor(opacity * 0.3 * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(0.6, `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(1, `${color}00`)
        
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2.5 + (isSpeaking ? 1 : 0)
        ctx.lineCap = 'round'
        ctx.shadowColor = color
        ctx.shadowBlur = 20
        ctx.stroke()
        
        ctx.strokeStyle = `${color}${Math.floor(opacity * 0.3 * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 5
        ctx.shadowBlur = 25
        ctx.stroke()
        
        ctx.strokeStyle = `${color}${Math.floor(opacity * 0.15 * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 8
        ctx.shadowBlur = 35
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

  const testVoiceAPI = async () => {
    try {
      const response = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test', voice: 'nova' })
      })
      
      if (response.ok) {
        setVoiceStatus('openai')
        console.log('✅ OpenAI TTS HD available - using premium voice')
      } else {
        const errorData = await response.json().catch(() => ({}))
        setVoiceStatus('error')
        setError(errorData.error || 'OpenAI API not configured')
        console.error('❌ OpenAI TTS unavailable:', errorData.error)
      }
    } catch (error) {
      setVoiceStatus('error')
      setError('Cannot connect to voice API - check OPENAI_API_KEY in Vercel')
      console.error('❌ OpenAI TTS test failed:', error)
    }
  }

  const playAudioFromText = async (text: string) => {
    try {
      setIsSpeaking(true)
      setError(null)
      
      const response = await fetch('/api/ai/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setVoiceStatus('error')
        throw new Error(errorData.error || 'OpenAI TTS API failed')
      }

      const audioBlob = await response.blob()
      
      if (audioBlob.type === 'application/json') {
        setVoiceStatus('error')
        throw new Error('OpenAI TTS API configuration error')
      }

      if (audioBlob.size === 0) {
        setVoiceStatus('error')
        throw new Error('OpenAI TTS returned no audio data')
      }

      setVoiceStatus('openai')

      const audioUrl = URL.createObjectURL(audioBlob)
      
      console.log('✅ Audio blob received:', audioBlob.size, 'bytes', 'type:', audioBlob.type)
      
      if (audioContextRef.current?.state === 'suspended') {
        console.log('Resuming audio context...')
        await audioContextRef.current.resume()
      }
      
      audioRef.current = new Audio(audioUrl)
      audioRef.current.volume = 1.0
      audioRef.current.preload = 'auto'
      
      audioRef.current.oncanplaythrough = () => {
        console.log('✅ Audio ready to play')
      }
      
      audioRef.current.onended = () => {
        console.log('✅ Audio playback ended')
        setIsSpeaking(false)
        setAudioLevel(0)
        URL.revokeObjectURL(audioUrl)
      }
      
      audioRef.current.onerror = (e) => {
        console.error('❌ Audio playback error:', e)
        setIsSpeaking(false)
        setAudioLevel(0)
        setError('Audio failed to play - check console')
        URL.revokeObjectURL(audioUrl)
      }
      
      audioRef.current.onloadeddata = () => {
        console.log('✅ Audio loaded, duration:', audioRef.current?.duration, 'seconds')
      }
      
      audioRef.current.onplay = () => {
        console.log('✅ Audio is now playing')
      }

      console.log('▶️ Attempting to play audio...')
      
      try {
        await audioRef.current.play()
        console.log('✅ Audio.play() successful')
      } catch (playError: any) {
        console.error('❌ Audio.play() failed:', playError.message)
        setError('Browser blocked audio - click the page first to enable audio')
        throw playError
      }
    } catch (error: any) {
      setIsSpeaking(false)
      setAudioLevel(0)
      const errorMsg = error.message || 'Voice system error'
      console.error('Voice Error:', errorMsg)
      
      if (errorMsg.includes('OPENAI_API_KEY') || errorMsg.includes('failed')) {
        setError('⚠️ OPENAI_API_KEY must be set in Vercel Environment Variables for voice to work')
      } else {
        setError(errorMsg)
      }
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
        body: JSON.stringify({ 
          messages: newHistory, 
          businessName,
          businessType,
          services,
          hours
        })
      })

      if (!response.ok) throw new Error('Conversation failed')
      
      const data = await response.json()
      const aiResponse = data.response

      setConversationHistory([...newHistory, { role: 'assistant', content: aiResponse }])
      setIsProcessing(false)
      await playAudioFromText(aiResponse)
    } catch (error: any) {
      setIsProcessing(false)
      setError(error.message || 'AI conversation failed')
      console.error('Conversation error:', error)
    }
  }

  const toggleListening = async () => {
    // Check microphone permission first
    if (micPermission === 'denied') {
      setError('Microphone access denied. Please enable it in your browser settings (click the 🔒 lock icon in the address bar)')
      return
    }
    
    if (micPermission !== 'granted') {
      const granted = await requestMicrophoneAccess()
      if (!granted) return
    }
    
    if (!recognitionRef.current) {
      alert('Voice requires Chrome, Edge, or Safari browser')
      return
    }
    
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (e) {
        console.error('Speech recognition start failed:', e)
        setError('Could not start listening. Please try again.')
      }
    }
  }

  const startDemo = async () => {
    // Request microphone access before starting
    if (micPermission !== 'granted') {
      const granted = await requestMicrophoneAccess()
      if (!granted) {
        setError('Microphone access is required for voice conversation. Please allow microphone access.')
        return
      }
    }
    
    setHasStarted(true)
    const greeting = `Hey! Thanks for trying ${businessName}. I'm your AI receptionist. What can I help you with today?`
    setConversationHistory([{ role: 'assistant', content: greeting }])
    await playAudioFromText(greeting)
  }

  const voiceOptions = [
    { id: 'nova', name: 'Nova', description: 'Warm & Natural (Recommended)' },
    { id: 'alloy', name: 'Alloy', description: 'Neutral & Professional' },
    { id: 'shimmer', name: 'Shimmer', description: 'Soft & Gentle' },
    { id: 'echo', name: 'Echo', description: 'Male Voice' },
    { id: 'fable', name: 'Fable', description: 'British Accent' }
  ]

  return (
    <div className="relative w-full">
      {/* Microphone Permission Banner */}
      {micPermission === 'denied' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-yellow-500/10 border-2 border-yellow-500/40 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-yellow-400 font-semibold text-sm mb-1">Microphone Access Required</p>
            <p className="text-yellow-300 text-xs mb-2">
              To use voice conversation, please enable microphone access in your browser.
            </p>
            <p className="text-gray-400 text-xs">
              Click the 🔒 lock icon in your address bar → Site settings → Allow Microphone
            </p>
          </div>
        </motion.div>
      )}

      {micPermission === 'prompt' && !hasStarted && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3"
        >
          <Mic className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-semibold text-sm mb-1">Microphone Access Needed</p>
            <p className="text-gray-300 text-xs">
              You'll be asked to allow microphone access when you start the demo.
            </p>
          </div>
        </motion.div>
      )}

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
          className="relative z-10 w-48 h-48 cursor-pointer overflow-hidden"
          style={{
            borderRadius: '47% 53% 52% 48% / 51% 49% 51% 49%',
            background: 'radial-gradient(ellipse at 35% 35%, rgba(30,25,45,0.8), rgba(0,0,0,1) 60%, rgba(0,0,0,1))',
            backdropFilter: 'blur(20px)'
          }}
          onClick={hasStarted ? (isProcessing || isSpeaking ? undefined : toggleListening) : startDemo}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              '0 0 40px rgba(139, 92, 246, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.9)',
              '0 0 60px rgba(139, 92, 246, 0.6), inset 0 0 40px rgba(0, 0, 0, 0.9)',
              '0 0 40px rgba(139, 92, 246, 0.4), inset 0 0 30px rgba(0, 0, 0, 0.9)',
            ],
            borderRadius: [
              '47% 53% 52% 48% / 51% 49% 51% 49%',
              '50% 50% 48% 52% / 49% 51% 49% 51%',
              '47% 53% 52% 48% / 51% 49% 51% 49%',
            ]
          }}
          transition={{ 
            boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            borderRadius: { duration: 8, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
              backgroundSize: 'cover'
            }}
          />
          
          <div className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-950/20 via-black to-black" />
          
          {(isListening || isSpeaking || isProcessing) && (
            <motion.div
              animate={{ opacity: [0.1, 0.3, 0.1], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-purple-600/20 blur-xl"
            />
          )}

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

        {/* Settings Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowSettings(!showSettings)
          }}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors z-20"
        >
          <Settings className="w-4 h-4 text-white/70" />
        </button>

        {/* Voice Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-16 right-4 bg-black/90 backdrop-blur-xl border border-purple-500/30 rounded-xl p-4 z-30 min-w-[250px]"
          >
            <p className="text-white text-sm font-semibold mb-3">Voice Options</p>
            <div className="space-y-2">
              {voiceOptions.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => {
                    setSelectedVoice(voice.id)
                    setShowSettings(false)
                  }}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    selectedVoice === voice.id
                      ? 'bg-purple-500/30 border border-purple-500/50'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p className="text-white text-sm font-medium">{voice.name}</p>
                  <p className="text-gray-400 text-xs">{voice.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
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
                <p className="text-gray-400 text-sm">Listen to the AI receptionist</p>
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
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mt-6 p-6 bg-red-500/10 border-2 border-red-500/40 rounded-xl text-center max-w-xl mx-auto"
        >
          <p className="text-red-400 text-base font-semibold mb-2">Issue Detected</p>
          <p className="text-red-300 text-sm mb-3">{error}</p>
        </motion.div>
      )}

      {!error && voiceStatus === 'openai' && (
        <div className="text-center mt-4">
          <p className="text-xs text-green-400 font-medium">
            ✓ Premium OpenAI Voice Active ({voiceOptions.find(v => v.id === selectedVoice)?.name})
          </p>
        </div>
      )}
    </div>
  )
}
