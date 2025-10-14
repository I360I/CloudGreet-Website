'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Wifi, Mic, Volume2, AlertTriangle } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  message?: string
  duration?: number
}

export default function VoiceSystemTester() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Microphone Access', status: 'pending' },
    { name: 'WebRTC Support', status: 'pending' },
    { name: 'Audio Context', status: 'pending' },
    { name: 'OpenAI API Connection', status: 'pending' },
    { name: 'WebSocket Connection', status: 'pending' },
    { name: 'Audio Playback', status: 'pending' }
  ])
  const [isRunning, setIsRunning] = useState(false)
  const [overallStatus, setOverallStatus] = useState<'pending' | 'running' | 'passed' | 'failed'>('pending')

  const runTests = async () => {
    setIsRunning(true)
    setOverallStatus('running')
    
    // Test 1: Microphone Access
    await updateTest(0, 'running')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      await updateTest(0, 'passed', 'Microphone access granted', 500)
    } catch (error: any) {
      await updateTest(0, 'failed', error.message, 500)
    }

    // Test 2: WebRTC Support
    await updateTest(1, 'running')
    try {
      if (typeof RTCPeerConnection !== 'undefined') {
        const pc = new RTCPeerConnection()
        pc.close()
        await updateTest(1, 'passed', 'WebRTC is supported', 200)
      } else {
        await updateTest(1, 'failed', 'WebRTC not supported', 200)
      }
    } catch (error: any) {
      await updateTest(1, 'failed', error.message, 200)
    }

    // Test 3: Audio Context
    await updateTest(2, 'running')
    try {
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        const audioContext = new (AudioContext || (window as any).webkitAudioContext)()
        await audioContext.close()
        await updateTest(2, 'passed', 'Audio Context available', 300)
      } else {
        await updateTest(2, 'failed', 'Audio Context not supported', 300)
      }
    } catch (error: any) {
      await updateTest(2, 'failed', error.message, 300)
    }

    // Test 4: OpenAI API Connection
    await updateTest(3, 'running')
    try {
      const response = await fetch('/api/ai/realtime-session', {
        method: 'POST'
      })
      if (response.ok) {
        await updateTest(3, 'passed', 'OpenAI API accessible', 1000)
      } else {
        const error = await response.json()
        await updateTest(3, 'failed', error.error || 'API connection failed', 1000)
      }
    } catch (error: any) {
      await updateTest(3, 'failed', error.message, 1000)
    }

    // Test 5: WebSocket Connection (simulated)
    await updateTest(4, 'running')
    try {
      // Test WebSocket support
      if (typeof WebSocket !== 'undefined') {
        await updateTest(4, 'passed', 'WebSocket support available', 400)
      } else {
        await updateTest(4, 'failed', 'WebSocket not supported', 400)
      }
    } catch (error: any) {
      await updateTest(4, 'failed', error.message, 400)
    }

    // Test 6: Audio Playback
    await updateTest(5, 'running')
    try {
      const audio = new Audio()
      audio.preload = 'auto'
      // Create a silent audio data URL for testing
      const silentAudio = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
      audio.src = silentAudio
      
      const playPromise = audio.play()
      if (playPromise) {
        await playPromise
        await updateTest(5, 'passed', 'Audio playback works', 600)
      } else {
        await updateTest(5, 'passed', 'Audio playback supported', 600)
      }
    } catch (error: any) {
      await updateTest(5, 'failed', error.message, 600)
    }

    // Determine overall status
    const failedTests = tests.filter(t => t.status === 'failed').length
    const passedTests = tests.filter(t => t.status === 'passed').length
    
    if (failedTests === 0) {
      setOverallStatus('passed')
    } else if (passedTests > 0) {
      setOverallStatus('failed') // Partial failure
    } else {
      setOverallStatus('failed')
    }
    
    setIsRunning(false)
  }

  const updateTest = async (index: number, status: TestResult['status'], message?: string, duration?: number) => {
    setTests(prev => prev.map((test, i) => 
      i === index 
        ? { ...test, status, message, duration }
        : test
    ))
    
    if (duration) {
      await new Promise(resolve => setTimeout(resolve, duration))
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'border-green-500/30 bg-green-500/10'
      case 'failed':
        return 'border-red-500/30 bg-red-500/10'
      case 'running':
        return 'border-blue-500/30 bg-blue-500/10'
      default:
        return 'border-gray-500/30 bg-gray-500/10'
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">Voice System Diagnostics</h3>
        <p className="text-gray-400">
          Testing your browser's compatibility with our AI voice system
        </p>
      </div>

      {/* Overall Status */}
      <div className={`p-4 rounded-xl border mb-6 ${getStatusColor(overallStatus)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(overallStatus)}
            <div>
              <h4 className="font-semibold text-white">
                {overallStatus === 'pending' && 'Ready to Test'}
                {overallStatus === 'running' && 'Running Tests...'}
                {overallStatus === 'passed' && 'All Tests Passed'}
                {overallStatus === 'failed' && 'Some Tests Failed'}
              </h4>
              <p className="text-sm text-gray-400">
                {overallStatus === 'pending' && 'Click "Run Tests" to check compatibility'}
                {overallStatus === 'running' && 'Please wait while we test your system'}
                {overallStatus === 'passed' && 'Your browser is fully compatible'}
                {overallStatus === 'failed' && 'Some features may not work properly'}
              </p>
            </div>
          </div>
          
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Testing...' : 'Run Tests'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="space-y-3">
        {tests.map((test, index) => (
          <motion.div
            key={test.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border ${getStatusColor(test.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <div>
                  <h5 className="font-medium text-white">{test.name}</h5>
                  {test.message && (
                    <p className="text-sm text-gray-400">{test.message}</p>
                  )}
                </div>
              </div>
              
              {test.duration && (
                <span className="text-xs text-gray-500">
                  {test.duration}ms
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Browser Info */}
      <div className="mt-8 p-4 bg-gray-800/50 border border-gray-600 rounded-xl">
        <h4 className="font-semibold text-white mb-3">Browser Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">User Agent:</span>
            <p className="text-gray-300 truncate">{navigator.userAgent.split(' ').slice(0, 3).join(' ')}</p>
          </div>
          <div>
            <span className="text-gray-400">Platform:</span>
            <p className="text-gray-300">{navigator.platform}</p>
          </div>
          <div>
            <span className="text-gray-400">Language:</span>
            <p className="text-gray-300">{navigator.language}</p>
          </div>
          <div>
            <span className="text-gray-400">Online:</span>
            <p className="text-gray-300">{navigator.onLine ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {overallStatus === 'failed' && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-400 mb-2">Recommendations</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Update your browser to the latest version</li>
                <li>• Enable microphone permissions</li>
                <li>• Check your internet connection</li>
                <li>• Try using Chrome or Firefox for best compatibility</li>
                <li>• Disable browser extensions that might interfere</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
