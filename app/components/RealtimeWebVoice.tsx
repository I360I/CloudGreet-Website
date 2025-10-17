"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Loader2, CheckCircle, X, Zap, Mic, MicOff } from 'lucide-react'

interface RealtimeWebVoiceProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
}

export default function RealtimeWebVoice({ 
  businessName = 'CloudGreet',
  businessType = 'AI Receptionist Service',
  services = 'AI phone answering, appointment scheduling, 24/7 support',
  hours = '24/7'
}: RealtimeWebVoiceProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [status, setStatus] = useState('Ready to connect')
  const [error, setError] = useState('')
  const [conversationLog, setConversationLog] = useState<string[]>([])
  
  const sessionRef = useRef<string | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize WebRTC connection
  const initializeWebRTC = async () => {
    try {
      setIsConnecting(true)
      setStatus('Connecting to real-time voice system...')
      setError('')

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      })
      localStreamRef.current = stream

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })
      pcRef.current = pc

      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('🎧 Remote audio track received')
        const remoteStream = event.streams[0]
        remoteStreamRef.current = remoteStream
        
        if (audioRef.current) {
          audioRef.current.srcObject = remoteStream
          audioRef.current.play()
        }
      }

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState)
        if (pc.connectionState === 'connected') {
          setIsConnected(true)
          setIsConnecting(false)
          setStatus('Connected to AI receptionist')
          setIsListening(true)
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setIsConnected(false)
          setIsConnecting(false)
          setStatus('Connection lost')
        }
      }

      // Create session with backend
      const response = await fetch('/api/webrtc/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          businessType,
          services,
          hours
        })
      })

      const { sessionId, sdp } = await response.json()
      sessionRef.current = sessionId

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))

      // Create and set local description
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Send answer to backend
      await fetch('/api/webrtc/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sdp: answer
        })
      })

      console.log('✅ WebRTC connection established')

    } catch (error: any) {
      console.error('❌ WebRTC error:', error)
      setError(error.message || 'Failed to connect to voice system')
      setIsConnecting(false)
      setStatus('Connection failed')
    }
  }

  // Disconnect from call
  const disconnect = () => {
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null
    }
    
    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setStatus('Disconnected')
    sessionRef.current = null
  }

  // Handle orb click
  const handleOrbClick = () => {
    if (isConnecting) return
    
    if (!isConnected) {
      initializeWebRTC()
    } else {
      disconnect()
    }
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Main Orb Container */}
      <motion.div
        className="relative w-80 h-80 mx-auto"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Outer Glow Ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isConnected ? [
              "0 0 0 0 rgba(16, 185, 129, 0.4)",
              "0 0 0 20px rgba(16, 185, 129, 0.1)",
              "0 0 0 0 rgba(16, 185, 129, 0.4)"
            ] : [
              "0 0 0 0 rgba(147, 51, 234, 0.4)",
              "0 0 0 20px rgba(147, 51, 234, 0.1)",
              "0 0 0 0 rgba(147, 51, 234, 0.4)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Middle Ring */}
        <motion.div
          className={`absolute inset-4 rounded-full border-2 ${
            isConnected ? 'border-green-400/30' : 'border-purple-400/30'
          }`}
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Inner Ring */}
        <motion.div
          className={`absolute inset-8 rounded-full border ${
            isConnected ? 'border-green-300/50' : 'border-purple-300/50'
          }`}
          animate={{
            rotate: -360
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Central Orb */}
        <motion.button
          onClick={handleOrbClick}
          disabled={isConnecting}
          className={`
            absolute inset-16 rounded-full flex items-center justify-center
            shadow-2xl border border-white/20
            transition-all duration-300
            ${isConnecting ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-105'}
            ${isConnected 
              ? 'bg-gradient-to-br from-green-600 to-emerald-600' 
              : 'bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800'
            }
          `}
          whileHover={!isConnecting ? { scale: 1.05 } : {}}
          whileTap={!isConnecting ? { scale: 0.95 } : {}}
        >
          {/* Orb Content */}
          <div className="text-center">
            {isConnecting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-12 h-12 text-white mx-auto" />
              </motion.div>
            ) : isConnected ? (
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {isListening ? (
                  <Mic className="w-12 h-12 text-white mx-auto" />
                ) : (
                  <MicOff className="w-12 h-12 text-white mx-auto" />
                )}
              </motion.div>
            ) : (
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Phone className="w-12 h-12 text-white mx-auto" />
              </motion.div>
            )}
          </div>

          {/* Pulsing dots around orb */}
          {!isConnecting && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-purple-400'
                  }`}
                  style={{
                    top: '50%',
                    left: '50%',
                    transformOrigin: '0 0',
                    transform: `rotate(${i * 45}deg) translateX(120px) translateY(-4px)`
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </>
          )}
        </motion.button>

        {/* Floating particles */}
        {!isConnecting && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-1 h-1 rounded-full ${
                  isConnected ? 'bg-green-300' : 'bg-purple-300'
                }`}
                style={{
                  top: `${20 + (i * 5)}%`,
                  left: `${15 + (i * 7)}%`,
                }}
                animate={{
                  y: [-20, 20, -20],
                  x: [-10, 10, -10],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 3 + (i * 0.2),
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
              />
            ))}
          </>
        )}
      </motion.div>

      {/* Status Text */}
      <motion.div
        className="text-center mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <motion.h3
          className="text-2xl font-bold text-white mb-2"
          animate={{
            color: isConnected ? '#10b981' : isConnecting ? '#f59e0b' : '#ffffff'
          }}
        >
          {status}
        </motion.h3>
        
        {!isConnected && !isConnecting && (
          <motion.p
            className="text-gray-400 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Click to start real-time voice conversation
          </motion.p>
        )}

        {isConnected && (
          <motion.p
            className="text-green-300 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Connected to AI receptionist - speak naturally
          </motion.p>
        )}
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-8 w-80 bg-red-600/20 backdrop-blur-xl border border-red-400/30 rounded-2xl p-6 shadow-2xl"
          >
            <div className="text-center">
              <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white mb-2">Connection Error</h3>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden audio element for remote stream */}
      <audio ref={audioRef} autoPlay playsInline />
    </div>
  )
}
