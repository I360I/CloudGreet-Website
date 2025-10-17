"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'

// TypeScript declarations for speech recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface TrueRealtimeVoiceProps {
  businessName: string
  businessType: string
  services: string
  hours: string
}

const TrueRealtimeVoice: React.FC<TrueRealtimeVoiceProps> = ({
  businessName,
  businessType,
  services,
  hours,
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [status, setStatus] = useState('Click to connect')
  const [error, setError] = useState<string | null>(null)
  const [currentMessage, setCurrentMessage] = useState('')

  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isPlayingAudioRef = useRef(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Initialize audio context and microphone
  const initializeAudio = useCallback(async () => {
    try {
      console.log('🎤 Initializing TRUE realtime audio...')
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser')
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          } 
        })
        mediaStreamRef.current = stream
        console.log('✅ Microphone permission granted')
      } catch (permissionError: any) {
        console.error('❌ Microphone permission denied:', permissionError)
        if (permissionError.name === 'NotAllowedError') {
          throw new Error('Microphone permission denied. Please allow microphone access and try again.')
        } else if (permissionError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.')
        } else {
          throw new Error(`Microphone error: ${permissionError.message}`)
        }
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1)
      
      scriptProcessorRef.current.onaudioprocess = (event) => {
        if (isListening && sessionIdRef.current) {
          const inputData = event.inputBuffer.getChannelData(0)
          // Convert Float32Array to Int16Array (PCM16) for realtime streaming
          const pcm16 = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF
          }
          
          // Send audio data to our server
          sendAudioData(pcm16)
        }
      }

      source.connect(scriptProcessorRef.current)
      scriptProcessorRef.current.connect(audioContextRef.current.destination)

      console.log('✅ TRUE realtime audio initialized')
      return true
    } catch (err: any) {
      console.error('❌ Audio initialization failed:', err)
      setError(`Audio error: ${err.message}`)
      return false
    }
  }, [isListening])

  // Send audio data to server
  const sendAudioData = useCallback(async (audioData: Int16Array) => {
    if (!sessionIdRef.current) return

    try {
      // Convert to base64 for transmission
      const buffer = new ArrayBuffer(audioData.length * 2)
      const view = new DataView(buffer)
      for (let i = 0; i < audioData.length; i++) {
        view.setInt16(i * 2, audioData[i], true)
      }
      const uint8Array = new Uint8Array(buffer)
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)))

      await fetch('/api/voice/send-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          audioData: base64
        }),
      })
    } catch (error) {
      console.error('❌ Error sending audio:', error)
    }
  }, [])

  // Convert text to speech and play
  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return

    try {
      console.log('🔊 Speaking:', text)
      setIsSpeaking(true)
      
      // Use browser's built-in speech synthesis
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 0.8
      
      utterance.onstart = () => {
        console.log('🔊 Speech started')
        setIsSpeaking(true)
      }
      
      utterance.onend = () => {
        console.log('🔊 Speech ended')
        setIsSpeaking(false)
      }
      
      utterance.onerror = (error) => {
        console.error('❌ Speech error:', error)
        setIsSpeaking(false)
      }
      
      speechSynthesis.speak(utterance)
    } catch (error) {
      console.error('❌ Error speaking text:', error)
      setIsSpeaking(false)
    }
  }, [])

  // Play audio response from OpenAI (for actual audio data)
  const playAudioResponse = useCallback(async (audioBase64: string) => {
    if (!audioContextRef.current) return

    try {
      const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0)).buffer
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData)
      
      audioQueueRef.current.push(new Float32Array(audioBuffer.getChannelData(0)))

      if (!isPlayingAudioRef.current) {
        processAudioQueue()
      }
    } catch (error) {
      console.error('❌ Error playing audio:', error)
    }
  }, [])

  const processAudioQueue = useCallback(async () => {
    if (audioQueueRef.current.length === 0 || isPlayingAudioRef.current) {
      isPlayingAudioRef.current = false
      setIsSpeaking(false)
      return
    }

    isPlayingAudioRef.current = true
    setIsSpeaking(true)
    const audioData = audioQueueRef.current.shift()!

    if (!audioContextRef.current) {
      isPlayingAudioRef.current = false
      setIsSpeaking(false)
      return
    }

    try {
      const buffer = audioContextRef.current.createBuffer(1, audioData.length, audioContextRef.current.sampleRate)
      const channelData = buffer.getChannelData(0)
      channelData.set(audioData)
      const source = audioContextRef.current.createBufferSource()
      source.buffer = buffer
      source.connect(audioContextRef.current.destination)
      source.onended = () => {
        isPlayingAudioRef.current = false
        processAudioQueue()
      }
      source.start(0)
    } catch (error) {
      console.error('❌ Error playing audio:', error)
      isPlayingAudioRef.current = false
      processAudioQueue()
    }
  }, [])

  // Connect to realtime system
  const connect = useCallback(async () => {
    try {
      console.log('🚀 Starting TRUE realtime voice system...')
      setIsInitializing(true)
      setError(null)

      // Initialize audio first
      const audioReady = await initializeAudio()
      if (!audioReady) {
        throw new Error('Audio initialization failed')
      }

      // Create OpenAI session via our API
      const response = await fetch('/api/voice/realtime-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'create_session',
          businessName
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create session')
      }

      const data = await response.json()
      sessionIdRef.current = data.sessionId
      
      console.log('✅ Session created:', data.sessionId)
      
      // Start Server-Sent Events connection for real-time responses
      const eventSource = new EventSource(`/api/voice/realtime-stream?sessionId=${data.sessionId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('✅ Connected to realtime stream')
        setIsConnected(true)
        setIsInitializing(false)
        setStatus('Connected - AI will greet you')
        
        // Send initial greeting
        sendGreeting()
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 Received from OpenAI:', data.type)

          if (data.type === 'response.audio.delta') {
            if (data.delta) {
              playAudioResponse(data.delta)
              console.log('🔊 Playing realtime audio response')
            }
          } else if (data.type === 'response.text.delta') {
            setCurrentMessage(prev => prev + (data.delta || ''))
            console.log('📝 Realtime text response:', data.delta)
          } else if (data.type === 'response.done') {
            // Speak the complete message when done
            const fullMessage = currentMessage + (data.delta || '')
            if (fullMessage.trim()) {
              speakText(fullMessage)
            }
            setCurrentMessage('')
            console.log('✅ Realtime response complete')
          } else if (data.type === 'error') {
            console.error('❌ OpenAI error:', data.error)
            setError(data.error?.message || 'OpenAI error')
            setIsInitializing(false)
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('❌ EventSource error:', error)
        setError('Connection error with realtime stream')
        setIsInitializing(false)
      }

    } catch (err: any) {
      console.error('❌ Connection failed:', err)
      setError(`Connection failed: ${err.message}`)
      setIsInitializing(false)
    }
  }, [initializeAudio, businessName, playAudioResponse])

  // Send greeting message
  const sendGreeting = useCallback(async () => {
    if (!sessionIdRef.current) return

    try {
      await fetch('/api/voice/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          message: {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: 'Hello, I just connected to the voice system.'
                }
              ]
            }
          }
        }),
      })
      console.log('🎤 Sent greeting message')
    } catch (error) {
      console.error('❌ Error sending greeting:', error)
    }
  }, [])

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser')
      return false
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    
    recognition.onstart = () => {
      console.log('🎤 Speech recognition started')
      setIsListening(true)
      setStatus('Listening...')
    }
    
    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }
      
      if (finalTranscript) {
        console.log('🎤 Final transcript:', finalTranscript)
        // Send the transcript to the API
        sendTranscript(finalTranscript)
      }
    }
    
    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error)
      if (event.error === 'no-speech') {
        console.log('🔇 No speech detected, continuing to listen...')
      } else {
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
        setStatus('Error in speech recognition')
      }
    }
    
    recognition.onend = () => {
      console.log('🔇 Speech recognition ended')
      if (isListening) {
        // Restart recognition if we're still supposed to be listening
        setTimeout(() => {
          if (isListening && sessionIdRef.current) {
            recognition.start()
          }
        }, 100)
      }
    }
    
    recognitionRef.current = recognition
    return true
  }, [isListening])

  // Send transcript to API
  const sendTranscript = useCallback(async (transcript: string) => {
    if (!sessionIdRef.current) return

    try {
      await fetch('/api/voice/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          message: {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: transcript
                }
              ]
            }
          }
        }),
      })
      console.log('💬 Sent transcript:', transcript)
    } catch (error) {
      console.error('❌ Error sending transcript:', error)
    }
  }, [])

  // Start listening
  const startListening = useCallback(() => {
    if (!sessionIdRef.current) {
      setError('Not connected to realtime system')
      return
    }
    
    console.log('🎤 Starting realtime listening...')
    
    if (!recognitionRef.current) {
      const success = initializeSpeechRecognition()
      if (!success) {
        setError('Speech recognition not supported in this browser')
        return
      }
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.start()
    }
  }, [initializeSpeechRecognition])

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('🔇 Stopping listening...')
    setIsListening(false)
    setStatus('Connected')
    
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('🛑 Disconnecting...')
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setIsConnected(false)
    setIsInitializing(false)
    setIsListening(false)
    setIsSpeaking(false)
    setStatus('Disconnected')
    setError(null)
    setCurrentMessage('')
    sessionIdRef.current = null
    audioQueueRef.current = []
    isPlayingAudioRef.current = false
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return (
    <div className="relative w-full max-w-md mx-auto bg-black rounded-3xl shadow-2xl border border-gray-800 p-8 flex flex-col items-center justify-center min-h-[500px]">
      {/* Ring Movie Style Orb */}
      <div className="relative mb-8">
        <div className="relative w-48 h-48">
          <motion.button
            onClick={isConnected ? (isListening ? stopListening : startListening) : connect}
            disabled={isInitializing}
            className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 ${
              isConnected 
                ? (isListening ? 'bg-red-600/20 hover:bg-red-600/30' : 'bg-green-600/20 hover:bg-green-600/30')
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } ${isInitializing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={{
              scale: isSpeaking ? [1, 1.05, 1] : 1,
            }}
            transition={{
              scale: { duration: 0.8, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }
            }}
            style={{
              background: isConnected 
                ? (isListening ? 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, rgba(0, 0, 0, 0.8) 70%)' 
                  : 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, rgba(0, 0, 0, 0.8) 70%)')
                : 'radial-gradient(circle, rgba(55, 65, 81, 0.3) 0%, rgba(0, 0, 0, 0.9) 70%)',
              border: '2px solid rgba(168, 85, 247, 0.3)',
              boxShadow: isConnected 
                ? (isListening ? '0 0 30px rgba(239, 68, 68, 0.5), inset 0 0 30px rgba(239, 68, 68, 0.1)' 
                  : '0 0 30px rgba(34, 197, 94, 0.5), inset 0 0 30px rgba(34, 197, 94, 0.1)')
                : '0 0 30px rgba(168, 85, 247, 0.3), inset 0 0 30px rgba(168, 85, 247, 0.1)'
            }}
          >
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-500/10 to-transparent" />
            
            <div className="relative z-10 flex items-center justify-center">
              {isInitializing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full"
                />
              ) : isConnected ? (
                <div className="text-white text-2xl">
                  {isListening ? '🎤' : (isSpeaking ? '🔊' : '👂')}
                </div>
              ) : (
                <div className="text-white text-2xl">📞</div>
              )}
            </div>

            {/* Helix Wave Lines */}
            <div className="absolute inset-0 rounded-full pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 bg-purple-400 rounded-full pointer-events-none"
                  style={{
                    height: '20px',
                    left: '50%',
                    top: '-10px',
                    transformOrigin: '50% 134px',
                    transform: `rotate(${i * 30}deg) translateY(-134px)`,
                    opacity: isConnected ? (isSpeaking ? 0.8 : 0.4) : 0.2,
                    boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)',
                    zIndex: 1
                  }}
                  animate={isSpeaking ? {
                    opacity: [0.4, 0.8, 0.4],
                    scale: [1, 1.2, 1]
                  } : {}}
                  transition={{
                    duration: 0.8,
                    repeat: isSpeaking ? Infinity : 0,
                    delay: i * 0.1
                  }}
                />
              ))}
            </div>
          </motion.button>

          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-purple-400/20 to-purple-500/20 blur-xl pointer-events-none" />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center mb-6">
        <div className={`w-3 h-3 rounded-full mr-3 ${
          isConnected ? (isListening ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-500'
        }`} />
        <span className="text-gray-300 text-sm font-medium">{status}</span>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm text-center mb-4 p-3 bg-red-900/20 rounded-lg border border-red-500/30"
        >
          {error}
        </motion.div>
      )}

      {/* Current Message */}
      {currentMessage && (
        <div className="w-full bg-gray-900/50 rounded-lg p-4 text-left mb-4">
          <div className="text-sm text-purple-300">
            <span className="font-semibold">AI:</span>
            <span className="ml-2">{currentMessage}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">
          {!isConnected ? 'Click the orb to connect' : 
           isListening ? 'Speak now...' : 
           isSpeaking ? 'AI is speaking...' : 
           'Click the orb to speak'}
        </p>
        {error && (error.includes('permission') || error.includes('Microphone') || error.includes('Audio initialization failed')) && (
          <button
            onClick={() => {
              setError(null)
              connect()
            }}
            className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
          >
            Allow Microphone & Retry
          </button>
        )}
      </div>
    </div>
  )
}

export default TrueRealtimeVoice