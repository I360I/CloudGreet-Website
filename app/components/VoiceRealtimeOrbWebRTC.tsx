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
        console.log('🔊 Received audio track:', e.track.kind)
        audioElement.srcObject = e.streams[0]
        
        // Ensure audio plays
        audioElement.play().catch(err => {
          console.error('Failed to play audio:', err)
          // Try to resume AudioContext if suspended
          if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume()
          }
        })
      }

      // Add local audio track for microphone
      pc.addTrack(stream.getTracks()[0])

      // Set up data channel for events
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc

      dc.onopen = () => {
        console.log('✅ Data channel opened')
        setIsConnected(true)
        
        // Send session configuration via data channel
        const sessionUpdate = {
          type: 'session.update',
          session: {
            instructions: `You are a professional AI receptionist for ${businessName}, a ${businessType}.

Services: ${services}
Hours: ${hours}

Be warm, professional, and helpful. Keep responses brief (20-30 words). 
Answer questions about services, hours, and pricing clearly.
Help schedule appointments if asked.
Be conversational and natural - you're having a phone conversation.`,
            voice: 'verse',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              silence_duration_ms: 700
            }
          }
        }
        
        console.log('📤 Sending session config:', sessionUpdate)
        dc.send(JSON.stringify(sessionUpdate))
      }

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          console.log('📥 Received event:', event.type, event)
          handleServerEvent(event)
        } catch (error) {
          console.error('Failed to parse event:', error, e.data)
        }
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
      console.error('❌ WebRTC connection failed:', error)
      
      // User-friendly error messages
      let errorMessage = 'Connection failed'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.'
      } else if (error.message.includes('Failed to create session')) {
        errorMessage = 'Server error. Please check your API key configuration.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      setIsConnected(false)
      cleanup()
    }
  }

  const handleServerEvent = (event: any) => {
    switch (event.type) {
      // Session events
      case 'session.created':
        console.log('✅ Session created:', event.session)
        break
        
      case 'session.updated':
        console.log('✅ Session updated')
        break
      
      // Input audio events (user speaking)
      case 'input_audio_buffer.speech_started':
        console.log('🎤 User started speaking')
        setIsListening(true)
        setIsSpeaking(false)
        break
        
      case 'input_audio_buffer.speech_stopped':
        console.log('🎤 User stopped speaking')
        setIsListening(false)
        break
      
      case 'input_audio_buffer.committed':
        console.log('✅ Audio buffer committed')
        break
      
      // Conversation events
      case 'conversation.item.created':
        console.log('💬 Conversation item created:', event.item?.type)
        break
        
      case 'conversation.item.input_audio_transcription.completed':
        console.log('📝 Transcription:', event.transcript)
        break
      
      // Response events (AI speaking)
      case 'response.created':
        console.log('🤖 AI response created')
        break
        
      case 'response.output_item.added':
        console.log('🤖 AI output item added')
        break
        
      case 'response.content_part.added':
        console.log('🤖 AI content part added')
        break
      
      case 'response.audio.delta':
        // AI is sending audio chunks
        if (!isSpeaking) {
          console.log('🔊 AI started speaking')
          setIsSpeaking(true)
          setIsListening(false)
        }
        break
        
      case 'response.audio.done':
        console.log('🔊 AI finished speaking')
        setIsSpeaking(false)
        break
        
      case 'response.done':
        console.log('✅ Response complete')
        setIsSpeaking(false)
        break
      
      // Error events
      case 'error':
        console.error('❌ Realtime API error:', event.error)
        setError(event.error?.message || 'Unknown error occurred')
        setIsSpeaking(false)
        setIsListening(false)
        break
      
      default:
        console.log('📥 Unhandled event:', event.type)
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
          className="relative z-10 w-96 h-96 cursor-pointer rounded-full overflow-hidden"
          style={{
            background: isListening 
              ? 'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.6) 35%, rgba(29, 78, 216, 0.3) 60%, rgba(0, 0, 0, 0.95))'
              : isSpeaking
              ? 'radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.8), rgba(126, 34, 206, 0.6) 35%, rgba(107, 33, 168, 0.3) 60%, rgba(0, 0, 0, 0.95))'
              : 'radial-gradient(circle at 30% 30%, rgba(88, 28, 135, 0.4), rgba(59, 7, 100, 0.3) 50%, rgba(0, 0, 0, 0.95))',
            backdropFilter: 'blur(40px)',
            border: isListening || isSpeaking ? '3px solid rgba(255,255,255,0.2)' : '2px solid rgba(255,255,255,0.08)',
            boxShadow: isListening || isSpeaking ? 'inset 0 0 60px rgba(255,255,255,0.1)' : 'inset 0 0 40px rgba(255,255,255,0.05)'
          }}
          onClick={() => {
            if (!isConnected) {
              connectToOpenAI()
            } else {
              cleanup()
            }
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          animate={{
            scale: isListening || isSpeaking ? 1 + (visualIntensity * 0.12) : 1,
            boxShadow: isListening 
              ? `0 0 ${80 + visualIntensity * 60}px rgba(59, 130, 246, ${0.7 + visualIntensity * 0.3}), inset 0 0 60px rgba(59, 130, 246, 0.2)`
              : isSpeaking
              ? `0 0 ${80 + visualIntensity * 60}px rgba(147, 51, 234, ${0.7 + visualIntensity * 0.3}), inset 0 0 60px rgba(147, 51, 234, 0.2)`
              : '0 0 50px rgba(139, 92, 246, 0.5)'
          }}
          transition={{ 
            scale: { duration: 0.15 },
            boxShadow: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* Multiple glow rings for depth */}
          {isListening && (
            <>
              <motion.div
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [0.85, 1 + visualIntensity * 0.25, 0.85]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-8 rounded-full bg-gradient-to-br from-blue-400/70 via-cyan-500/60 to-blue-600/50 blur-3xl"
              />
              <motion.div
                animate={{ 
                  opacity: [0.4, 0.7, 0.4],
                  scale: [0.9, 1.15 + visualIntensity * 0.2, 0.9]
                }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                className="absolute inset-16 rounded-full bg-gradient-to-br from-blue-300/50 via-cyan-400/40 to-blue-500/30 blur-2xl"
              />
            </>
          )}
          
          {isSpeaking && (
            <>
              <motion.div
                animate={{ 
                  opacity: [0.4, 0.7, 0.4],
                  scale: [0.85, 1.2 + visualIntensity * 0.3, 0.85]
                }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-8 rounded-full bg-gradient-to-br from-purple-400/80 via-fuchsia-500/70 to-purple-600/60 blur-3xl"
              />
              <motion.div
                animate={{ 
                  opacity: [0.5, 0.8, 0.5],
                  scale: [0.9, 1.25 + visualIntensity * 0.35, 0.9]
                }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                className="absolute inset-16 rounded-full bg-gradient-to-br from-purple-300/60 via-fuchsia-400/50 to-purple-500/40 blur-2xl"
              />
            </>
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
                  className="bg-gradient-to-br from-white/25 to-white/10 rounded-full p-10 backdrop-blur-xl border-2 border-white/30 shadow-2xl"
                >
                  <Mic className="w-20 h-20 text-white drop-shadow-lg" />
                </motion.div>
              ) : isSpeaking ? (
                <motion.div 
                  key="speaking" 
                  animate={{ 
                    scale: [1, 1.08 + visualIntensity * 0.15, 1],
                    rotate: [0, 5, -5, 0]
                  }} 
                  transition={{ 
                    scale: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="bg-purple-500/40 rounded-full p-10 backdrop-blur-xl border-3 border-purple-400/60 shadow-2xl"
                >
                  <Volume2 className="w-20 h-20 text-purple-100 drop-shadow-lg" />
                </motion.div>
              ) : isListening ? (
                <motion.div 
                  key="listening"
                  animate={{ 
                    scale: 1 + visualIntensity * 0.3,
                    boxShadow: `0 0 ${20 + visualIntensity * 30}px rgba(59, 130, 246, ${0.5 + visualIntensity * 0.5})`
                  }} 
                  transition={{ duration: 0.1 }}
                  className="bg-blue-500/40 rounded-full p-10 backdrop-blur-xl border-3 border-blue-400/70 shadow-2xl"
                >
                  <Mic className="w-20 h-20 text-blue-100 drop-shadow-lg" />
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.05, 1]
                  }} 
                  transition={{ 
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                    scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="bg-white/15 rounded-full p-9 backdrop-blur-xl border-2 border-white/20 shadow-2xl"
                >
                  <Sparkles className="w-18 h-18 text-purple-200 drop-shadow-lg" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Enhanced audio visualizer */}
          {(isListening || isSpeaking) && visualIntensity > 0.03 && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: [
                      25, 
                      25 + visualIntensity * 120 * (1 - Math.abs(i - 4) * 0.15), 
                      25
                    ],
                    opacity: [0.6, 0.9, 0.6]
                  }}
                  transition={{ 
                    duration: 0.35, 
                    repeat: Infinity, 
                    delay: i * 0.06,
                    ease: "easeInOut"
                  }}
                  className={`w-2.5 rounded-full shadow-lg ${
                    isListening 
                      ? 'bg-gradient-to-t from-blue-500 via-cyan-400 to-blue-300' 
                      : 'bg-gradient-to-t from-purple-500 via-fuchsia-400 to-purple-300'
                  }`}
                  style={{
                    boxShadow: isListening 
                      ? '0 0 10px rgba(59, 130, 246, 0.8)' 
                      : '0 0 10px rgba(147, 51, 234, 0.8)'
                  }}
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

