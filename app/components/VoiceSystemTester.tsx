'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, CheckCircle, XCircle, AlertTriangle, RefreshCw, Info } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  message: string
  details?: string
}

export default function VoiceSystemTester() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Browser Support', status: 'pending', message: 'Checking WebRTC and Media API support...' },
    { name: 'Microphone Access', status: 'pending', message: 'Testing microphone permissions...' },
    { name: 'Audio Context', status: 'pending', message: 'Initializing Web Audio API...' },
    { name: 'Audio Quality', status: 'pending', message: 'Testing audio input quality...' },
    { name: 'Network Connectivity', status: 'pending', message: 'Checking network connection...' },
    { name: 'WebRTC Connection', status: 'pending', message: 'Testing WebRTC peer connection...' }
  ])
  
  const [isRunning, setIsRunning] = useState(false)
  const [overallStatus, setOverallStatus] = useState<'pending' | 'running' | 'passed' | 'failed'>('pending')
  const [audioLevel, setAudioLevel] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const updateTest = (index: number, status: TestResult['status'], message: string, details?: string) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, details } : test
    ))
  }

  const runTests = async () => {
    setIsRunning(true)
    setOverallStatus('running')
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const })))

    try {
      // Test 1: Browser Support
      updateTest(0, 'running', 'Checking WebRTC and Media API support...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      const hasRTCPeerConnection = !!window.RTCPeerConnection
      const hasAudioContext = !!window.AudioContext
      
      if (hasGetUserMedia && hasRTCPeerConnection && hasAudioContext) {
        updateTest(0, 'passed', 'All required APIs are supported', 
          `getUserMedia: ${hasGetUserMedia}, RTCPeerConnection: ${hasRTCPeerConnection}, AudioContext: ${hasAudioContext}`)
      } else {
        updateTest(0, 'failed', 'Browser does not support required APIs', 
          `Missing: getUserMedia(${hasGetUserMedia}), RTCPeerConnection(${hasRTCPeerConnection}), AudioContext(${hasAudioContext})`)
      }

      // Test 2: Microphone Access
      updateTest(1, 'running', 'Testing microphone permissions...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        
        const audioTrack = stream.getAudioTracks()[0]
        if (audioTrack) {
          updateTest(1, 'passed', 'Microphone access granted', 
            `Device: ${audioTrack.label || 'Default'}, State: ${audioTrack.readyState}`)
          
          // Store stream for audio quality test
          mediaStreamRef.current = stream
        } else {
          updateTest(1, 'failed', 'No audio track found in stream')
        }
      } catch (error: any) {
        updateTest(1, 'failed', `Microphone access denied: ${error.name}`, error.message)
      }

      // Test 3: Audio Context
      updateTest(2, 'running', 'Initializing Web Audio API...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      try {
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext
        
        if (audioContext.state === 'running') {
          updateTest(2, 'passed', 'Audio context initialized successfully', 
            `State: ${audioContext.state}, Sample Rate: ${audioContext.sampleRate}Hz`)
        } else {
          updateTest(2, 'failed', `Audio context state: ${audioContext.state}`)
        }
      } catch (error: any) {
        updateTest(2, 'failed', 'Failed to create audio context', error.message)
      }

      // Test 4: Audio Quality
      updateTest(3, 'running', 'Testing audio input quality...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (mediaStreamRef.current && audioContextRef.current) {
        try {
          const analyzer = audioContextRef.current.createAnalyser()
          analyzer.fftSize = 256
          const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current)
          source.connect(analyzer)
          analyzerRef.current = analyzer
          
          // Start monitoring audio levels
          setIsRecording(true)
          
          // Monitor for 3 seconds
          setTimeout(() => {
            setIsRecording(false)
            if (audioLevel > 0.01) {
              updateTest(3, 'passed', 'Audio input detected', 
                `Peak level: ${Math.round(audioLevel * 100)}%`)
            } else {
              updateTest(3, 'failed', 'No audio input detected', 
                'Please speak into your microphone or check audio levels')
            }
          }, 3000)
          
        } catch (error: any) {
          updateTest(3, 'failed', 'Failed to analyze audio', error.message)
        }
      } else {
        updateTest(3, 'failed', 'Prerequisites not met', 'Microphone access or audio context not available')
      }

      // Test 5: Network Connectivity
      updateTest(4, 'running', 'Checking network connection...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'HEAD',
          headers: { 'User-Agent': 'CloudGreet-Test' }
        })
        
        if (response.ok) {
          updateTest(4, 'passed', 'Network connectivity confirmed', 
            `Response time: ${Date.now()}ms`)
        } else {
          updateTest(4, 'failed', `Network error: ${response.status}`, response.statusText)
        }
      } catch (error: any) {
        updateTest(4, 'failed', 'Network connectivity failed', error.message)
      }

      // Test 6: WebRTC Connection
      updateTest(5, 'running', 'Testing WebRTC peer connection...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        })
        
        // Test ICE gathering
        const icePromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('ICE gathering timeout')), 10000)
          
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              clearTimeout(timeout)
              resolve()
            }
          }
          
          pc.onicecandidate = (event) => {
            if (!event.candidate) {
              clearTimeout(timeout)
              resolve()
            }
          }
        })
        
        // Create a dummy offer to trigger ICE gathering
        await pc.createOffer()
        
        try {
          await icePromise
          updateTest(5, 'passed', 'WebRTC peer connection successful', 
            `ICE gathering state: ${pc.iceGatheringState}`)
        } catch (iceError: any) {
          updateTest(5, 'failed', 'ICE gathering failed', iceError.message)
        }
        
        pc.close()
        
      } catch (error: any) {
        updateTest(5, 'failed', 'WebRTC connection failed', error.message)
      }

      // Determine overall status
      const failedTests = tests.filter(test => test.status === 'failed').length
      if (failedTests === 0) {
        setOverallStatus('passed')
      } else {
        setOverallStatus('failed')
      }

    } catch (error: any) {
      console.error('Test suite error:', error)
      setOverallStatus('failed')
    } finally {
      setIsRunning(false)
      cleanup()
    }
  }

  const cleanup = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    analyzerRef.current = null
    setIsRecording(false)
    setAudioLevel(0)
  }

  // Monitor audio levels when recording
  useEffect(() => {
    if (isRecording && analyzerRef.current) {
      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount)
      
      const checkLevel = () => {
        if (!analyzerRef.current || !isRecording) return
        
        analyzerRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        const normalizedLevel = Math.min(average / 128, 1)
        
        setAudioLevel(Math.max(audioLevel, normalizedLevel))
        
        animationFrameRef.current = requestAnimationFrame(checkLevel)
      }
      
      checkLevel()
    }
  }, [isRecording, audioLevel])

  useEffect(() => {
    return cleanup
  }, [])

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-gray-500" />
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
    }
  }

  const getOverallIcon = () => {
    switch (overallStatus) {
      case 'pending':
        return <Info className="w-6 h-6 text-gray-400" />
      case 'running':
        return <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
      case 'passed':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      case 'failed':
        return <AlertTriangle className="w-6 h-6 text-red-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getOverallIcon()}
          <div>
            <h3 className="text-lg font-semibold text-white">Voice System Diagnostics</h3>
            <p className="text-sm text-gray-400">
              {overallStatus === 'pending' && 'Ready to run diagnostics'}
              {overallStatus === 'running' && 'Running system tests...'}
              {overallStatus === 'passed' && 'All tests passed - system ready'}
              {overallStatus === 'failed' && 'Some tests failed - see details below'}
            </p>
          </div>
        </div>
        
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Run Tests
            </>
          )}
        </button>
      </div>

      {/* Audio Level Indicator */}
      {isRecording && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <Mic className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-medium">Testing Audio Input</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-green-400 h-2 rounded-full"
                animate={{ width: `${Math.max(audioLevel * 100, 2)}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <span className="text-sm text-gray-400 w-12 text-right">
              {Math.round(audioLevel * 100)}%
            </span>
          </div>
          
          <p className="text-xs text-gray-400 mt-2">
            Please speak into your microphone to test audio levels
          </p>
        </motion.div>
      )}

      {/* Test Results */}
      <div className="space-y-3">
        {tests.map((test, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              {getStatusIcon(test.status)}
              <div className="flex-1">
                <h4 className="font-medium text-white">{test.name}</h4>
                <p className="text-sm text-gray-400 mt-1">{test.message}</p>
                {test.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                      Technical Details
                    </summary>
                    <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-800/50 p-2 rounded">
                      {test.details}
                    </p>
                  </details>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recommendations */}
      {overallStatus === 'failed' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
        >
          <h4 className="font-medium text-red-400 mb-2">Troubleshooting Recommendations</h4>
          <ul className="text-sm text-red-300 space-y-1">
            <li>• Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)</li>
            <li>• Check that microphone permissions are granted</li>
            <li>• Close other applications that might be using your microphone</li>
            <li>• Try refreshing the page and running the test again</li>
            <li>• Check your internet connection for WebRTC tests</li>
            <li>• If problems persist, try using a different device or browser</li>
          </ul>
        </motion.div>
      )}

      {overallStatus === 'passed' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/30 rounded-lg p-4"
        >
          <h4 className="font-medium text-green-400 mb-2">System Ready!</h4>
          <p className="text-sm text-green-300">
            All diagnostic tests passed. Your voice system is ready to use. 
            You can now return to the voice demo and start a conversation.
          </p>
        </motion.div>
      )}
    </div>
  )
}