"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Sparkles, AlertCircle } from 'lucide-react'

interface VoiceRealtimeOrbProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
}

export default function VoiceRealtimeOrbWebRTC({ 
  businessName = 'CloudGreet', 
  businessType = 'AI Receptionist Service',
  services = 'AI phone answering, appointment scheduling',
  hours = '24/7'
}: VoiceRealtimeOrbProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visualIntensity, setVisualIntensity] = useState(0)
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const connectToOpenAI = async () => {
    try {
      setError(null)

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      mediaStreamRef.current = stream

      // Set up audio analyzer for visualizations
      audioContextRef.current = new AudioContext()
      const analyzer = audioContextRef.current.createAnalyser()
      analyzer.fftSize = 256
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyzer)
      analyzerRef.current = analyzer
      monitorAudioLevel()

      // Get ephemeral token from backend
      const tokenRes = await fetch('/api/ai/realtime-session', {
        method: 'POST'
      })
      
      if (!tokenRes.ok) {
        const errorData = await tokenRes.json()
        throw new Error(errorData.error || 'Failed to create session')
      }
      
      const { clientSecret } = await tokenRes.json()

      // Create WebRTC peer connection
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc

      // Set up audio element to play remote audio from AI
      const audioElement = document.createElement('audio')
      audioElement.autoplay = true
      audioElementRef.current = audioElement
      
      pc.ontrack = (e) => {
        audioElement.srcObject = e.streams[0]
        setIsSpeaking(true)
      }

      // Add local audio track for microphone
      pc.addTrack(stream.getTracks()[0])

      // Set up data channel for events
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc

      dc.onopen = () => {
        setIsConnected(true)
        
        // Send session configuration via data channel
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: `You are a professional AI receptionist for ${businessName}, a ${businessType}.

Services: ${services}
Hours: ${hours}

Be warm, professional, and helpful. Keep responses brief (20-30 words). 
Answer questions about services, hours, and pricing clearly.
Help schedule appointments if asked.
Be conversational and natural - you're having a phone conversation.`
          }
        }))
      }

      dc.onmessage = (e) => {
        const event = JSON.parse(e.data)
        handleServerEvent(event)
      }

      dc.onerror = (error) => {
        console.error('Data channel error:', error)
        setError('Connection error')
      }

      // Create offer and get SDP
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send SDP to OpenAI Realtime API
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Authorization': `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp'
        }
      })

      if (!sdpResponse.ok) {
        throw new Error(`SDP exchange failed: ${sdpResponse.status}`)
      }

      const answerSdp = await sdpResponse.text()
      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: answerSdp
      }
      await pc.setRemoteDescription(answer)

    } catch (error: any) {
      console.error('WebRTC connection failed:', error)
      setError('Connection failed: ' + error.message)
      setIsConnected(false)
      cleanup()
    }
  }

  const handleServerEvent = (event: any) => {
    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        break
        
      case 'input_audio_buffer.speech_started':
        setIsListening(true)
        break
        
      case 'input_audio_buffer.speech_stopped':
        setIsListening(false)
        break
        
      case 'response.output_audio.start':
        setIsSpeaking(true)
        break
        
      case 'response.output_audio.done':
        setIsSpeaking(false)
        break
        
      case 'error':
        console.error('Realtime API error:', event.error)
        setError(event.error.message)
        break
    }
  }

  const monitorAudioLevel = () => {
    if (!analyzerRef.current) return
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount)
    
    const checkLevel = () => {
      if (!analyzerRef.current) return
      
      analyzerRef.current.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      const normalizedLevel = Math.min(average / 128, 1)
      
      setVisualIntensity(normalizedLevel * 2)
      
      animationFrameRef.current = requestAnimationFrame(checkLevel)
    }
    
    checkLevel()
  }

  const cleanup = () => {
    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setVisualIntensity(0)
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null
      audioElementRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    analyzerRef.current = null
  }

  return (
    <div className="w-full">
      {/* Premium Voice Orb */}
      <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center">
        <motion.div
          className="relative z-10 w-80 h-80 cursor-pointer rounded-full overflow-hidden"
          style={{
            background: isListening 
              ? 'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.6), rgba(37, 99, 235, 0.4) 40%, rgba(29, 78, 216, 0.2) 70%, rgba(0, 0, 0, 0.95))'
              : isSpeaking
              ? 'radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.6), rgba(126, 34, 206, 0.4) 40%, rgba(107, 33, 168, 0.2) 70%, rgba(0, 0, 0, 0.95))'
              : 'radial-gradient(circle at 30% 30%, rgba(88, 28, 135, 0.3), rgba(59, 7, 100, 0.2) 50%, rgba(0, 0, 0, 0.95))',
            backdropFilter: 'blur(30px)',
            border: isListening || isSpeaking ? '2px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)'
          }}
          onClick={() => {
            if (!isConnected) {
              connectToOpenAI()
            } else {
              cleanup()
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            scale: isListening || isSpeaking ? 1 + (visualIntensity * 0.15) : 1,
            boxShadow: isListening 
              ? `0 0 ${60 + visualIntensity * 40}px rgba(59, 130, 246, ${0.6 + visualIntensity * 0.3})`
              : isSpeaking
              ? `0 0 ${60 + visualIntensity * 40}px rgba(147, 51, 234, ${0.6 + visualIntensity * 0.3})`
              : '0 0 40px rgba(139, 92, 246, 0.4)'
          }}
          transition={{ 
            scale: { duration: 0.2 },
            boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* Glow rings */}
          {isListening && (
            <motion.div
              animate={{ 
                opacity: [0.4, 0.7, 0.4],
                scale: [0.9, 1 + visualIntensity * 0.2, 0.9]
              }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute inset-12 rounded-full bg-gradient-to-br from-blue-400/60 via-cyan-500/50 to-blue-600/40 blur-2xl"
            />
          )}
          
          {isSpeaking && (
            <motion.div
              animate={{ 
                opacity: [0.5, 0.8, 0.5],
                scale: [0.9, 1.1 + visualIntensity * 0.3, 0.9]
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-12 rounded-full bg-gradient-to-br from-purple-400/70 via-fuchsia-500/60 to-purple-600/50 blur-2xl"
            />
          )}

          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!isConnected ? (
                <motion.div 
                  key="start" 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  exit={{ scale: 0 }}
                  className="bg-gradient-to-br from-white/20 to-white/5 rounded-full p-8 backdrop-blur-xl border border-white/20"
                >
                  <Mic className="w-16 h-16 text-white" />
                </motion.div>
              ) : isSpeaking ? (
                <motion.div 
                  key="speaking" 
                  animate={{ scale: [1, 1.1, 1] }} 
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="bg-purple-500/30 rounded-full p-8 backdrop-blur-xl border-2 border-purple-400/50"
                >
                  <Volume2 className="w-16 h-16 text-purple-200" />
                </motion.div>
              ) : isListening ? (
                <motion.div 
                  animate={{ scale: 1 + visualIntensity * 0.25 }} 
                  transition={{ duration: 0.1 }}
                  className="bg-blue-500/30 rounded-full p-8 backdrop-blur-xl border-2 border-blue-400/60"
                >
                  <Mic className="w-16 h-16 text-blue-200" />
                </motion.div>
              ) : (
                <motion.div 
                  animate={{ rotate: [0, 360] }} 
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="bg-white/10 rounded-full p-8 backdrop-blur-xl border border-white/10"
                >
                  <Sparkles className="w-14 h-14 text-purple-300/80" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Audio visualizer */}
          {isListening && visualIntensity > 0.05 && (
            <div className="absolute inset-0 flex items-center justify-center gap-3 pointer-events-none">
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: [30, 30 + visualIntensity * 100 * (1 - Math.abs(i - 3) * 0.2), 30]
                  }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08 }}
                  className="w-2 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-full shadow-lg"
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Status */}
      <motion.div className="text-center mt-8">
        <AnimatePresence mode="wait">
          {!isConnected ? (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Click to Start
              </h3>
              <p className="text-gray-400">Real-time voice AI • WebRTC</p>
            </motion.div>
          ) : isListening ? (
            <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="text-2xl font-bold text-blue-400">Listening...</h3>
            </motion.div>
          ) : isSpeaking ? (
            <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="text-2xl font-bold text-purple-400">AI Speaking</h3>
            </motion.div>
          ) : (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="text-2xl font-bold text-white">Connected</h3>
              <p className="text-gray-400">Start speaking</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center max-w-md mx-auto">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}
    </div>
  )
}

