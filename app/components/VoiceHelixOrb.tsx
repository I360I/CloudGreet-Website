"use client"

import React, { useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Phone, Sparkles } from 'lucide-react'

// Utility: generate a helix path
function createHelixPath(turns = 4, radius = 1, length = 4, points = 400) {
  const pts = []
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2 * turns
    const x = Math.cos(t) * radius
    const y = (i / points - 0.5) * length
    const z = Math.sin(t) * radius
    pts.push(new THREE.Vector3(x, y, z))
  }
  return new THREE.CatmullRomCurve3(pts)
}

// Component for one glowing strand
const GlowingStrand = ({ colour, speed, offset = 0, analyser, isActive }: any) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const baseRadius = 1.2
  
  const geometry = useMemo(() => {
    const path = createHelixPath(3.5, baseRadius, 3.5)
    return new THREE.TubeGeometry(path, 600, 0.06, 8, false)
  }, [])
  
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(colour),
        emissive: new THREE.Color(colour),
        emissiveIntensity: isActive ? 1.2 : 0.8,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [colour, isActive]
  )

  // Animate rotation and scale in response to audio
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    
    const t = clock.getElapsedTime() * speed + offset
    meshRef.current.rotation.y = t
    meshRef.current.rotation.z = t * 0.5

    // If analyser provided, scale radius based on volume
    if (analyser && isActive) {
      try {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((sum: number, v: number) => sum + v, 0) / dataArray.length / 255
        const scale = 1 + avg * 0.6
        meshRef.current.scale.setScalar(scale)
      } catch (e) {
        // Silent fail if audio not available
      }
    } else {
      // Gentle breathing when not active
      const breathe = 1 + Math.sin(t * 2) * 0.05
      meshRef.current.scale.setScalar(breathe)
    }
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}

interface VoiceHelixOrbProps {
  businessName?: string
  isDemo?: boolean
}

export default function VoiceHelixOrb({ businessName = 'CloudGreet', isDemo = true }: VoiceHelixOrbProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [hasStarted, setHasStarted] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

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
    }
  }, [])

  const playAudioFromText = async (text: string) => {
    try {
      setIsSpeaking(true)
      setError(null)
      
      // Call OpenAI TTS HD API
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
        const source = audioContextRef.current.createMediaElementSource(audioRef.current)
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        source.connect(analyserRef.current)
        analyserRef.current.connect(audioContextRef.current.destination)
      }
      
      audioRef.current.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      audioRef.current.onerror = () => {
        setIsSpeaking(false)
        setError('Audio playback failed')
        URL.revokeObjectURL(audioUrl)
      }

      await audioRef.current.play()
    } catch (error: any) {
      console.error('Audio playback error:', error)
      setIsSpeaking(false)
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
      {/* 3D Helix Orb */}
      <div className="relative w-full h-[400px] md:h-[500px]">
        <Canvas
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, 6], fov: 45 }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 6]} />
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 5, 5]} intensity={0.8} />
          <pointLight position={[-5, -5, -5]} intensity={0.4} color="#8b5cf6" />
          
          {/* Dark core sphere - matches hero dark blue */}
          <mesh>
            <sphereGeometry args={[1.0, 64, 64]} />
            <meshStandardMaterial
              color="#0a0f1e"
              roughness={0.8}
              metalness={0.2}
              emissive="#0a0f1e"
              emissiveIntensity={0.2}
            />
          </mesh>
          
          {/* Glowing helix strands - match hero colors */}
          <GlowingStrand colour="#6366f1" speed={0.15} offset={0} analyser={analyserRef.current} isActive={isActive} />
          <GlowingStrand colour="#8b5cf6" speed={0.18} offset={2} analyser={analyserRef.current} isActive={isActive} />
          <GlowingStrand colour="#a855f7" speed={0.20} offset={4} analyser={analyserRef.current} isActive={isActive} />
          <GlowingStrand colour="#ec4899" speed={0.22} offset={6} analyser={analyserRef.current} isActive={isActive} />
          <GlowingStrand colour="#3b82f6" speed={0.16} offset={8} analyser={analyserRef.current} isActive={isActive} />
        </Canvas>

        {/* Interactive Button Overlay */}
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ pointerEvents: 'auto' }}
        >
          <motion.button
            onClick={hasStarted ? (isProcessing || isSpeaking ? undefined : toggleListening) : startDemo}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-purple-500/30 flex items-center justify-center cursor-pointer group relative overflow-hidden shadow-2xl"
            aria-label={!hasStarted ? "Start voice demo" : isListening ? "Stop listening" : "Start speaking"}
          >
            {/* Animated gradient background */}
            <motion.div
              animate={{
                background: isActive
                  ? [
                      'radial-gradient(circle, rgba(139,92,246,0.3), transparent)',
                      'radial-gradient(circle, rgba(99,102,241,0.3), transparent)',
                      'radial-gradient(circle, rgba(139,92,246,0.3), transparent)',
                    ]
                  : 'radial-gradient(circle, rgba(59,130,246,0.1), transparent)'
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0"
            />

            {/* Icon */}
            <div className="relative z-10">
              <AnimatePresence mode="wait">
                {!hasStarted ? (
                  <motion.div
                    key="phone"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                  >
                    <Phone className="w-14 h-14 md:w-16 md:h-16 text-white drop-shadow-2xl" />
                  </motion.div>
                ) : isProcessing ? (
                  <motion.div
                    key="processing"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    exit={{ scale: 0 }}
                    transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" } }}
                  >
                    <Sparkles className="w-14 h-14 md:w-16 md:h-16 text-purple-400 drop-shadow-2xl" />
                  </motion.div>
                ) : isListening ? (
                  <motion.div
                    key="mic"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    exit={{ scale: 0 }}
                    transition={{ scale: { duration: 0.8, repeat: Infinity } }}
                  >
                    <Mic className="w-14 h-14 md:w-16 md:h-16 text-blue-400 drop-shadow-2xl" />
                  </motion.div>
                ) : isSpeaking ? (
                  <motion.div
                    key="volume"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    exit={{ scale: 0 }}
                    transition={{ scale: { duration: 1, repeat: Infinity } }}
                  >
                    <Volume2 className="w-14 h-14 md:w-16 md:h-16 text-pink-400 drop-shadow-2xl" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="micoff"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <MicOff className="w-14 h-14 md:w-16 md:h-16 text-white/70 drop-shadow-2xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pulsing ring effect */}
            {isActive && (
              <motion.div
                animate={{
                  scale: [1, 1.8],
                  opacity: [0.5, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className="absolute inset-0 rounded-full border-2 border-purple-400"
              />
            )}
          </motion.button>
        </div>
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
                Click to Experience
              </h3>
              <p className="text-gray-400 text-base md:text-lg">Real AI conversation with voice-reactive helix</p>
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
                Speaking...
              </h3>
              <p className="text-gray-300 text-base">Natural AI voice with audio-reactive strands</p>
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
            🎙️ OpenAI TTS HD 'nova' voice | 3D helix reacts to AI speech | Best in Chrome/Edge/Safari
          </p>
        </div>
      )}
    </div>
  )
}

