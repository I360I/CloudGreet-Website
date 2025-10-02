'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Play, Pause, Volume2, Settings, CheckCircle, AlertCircle, Clock, Brain, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '../contexts/ToastContext'

export default function TestAgentPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    phoneNumber: '',
    greetingMessage: '',
    isActive: false
  })
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [callTranscript, setCallTranscript] = useState<{speaker: string, text: string, delay: number}[]>([])
  const [isCallActive, setIsCallActive] = useState(false)
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    loadBusinessInfo()
  }, [loadBusinessInfo])

  const loadBusinessInfo = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showError('Please log in to test your agent')
        return
      }

      const response = await fetch('/api/business/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBusinessInfo({
            businessName: data.data.businessName || 'Your Business',
            phoneNumber: data.data.phone || 'Not configured',
            greetingMessage: data.data.greetingMessage || 'Hello! Thank you for calling.',
            isActive: data.data.onboardingCompleted || false
          })
        }
      }
    } catch (error) {
      console.error('Failed to load business info:', error)
      showError('Failed to load business information')
    }
  }

  const simulateCall = () => {
    setIsCallActive(true)
    setCallTranscript([])
    setTestStatus('testing')
    
    const messages = [
      {
        speaker: 'AI',
        text: businessInfo.greetingMessage,
        delay: 1000
      },
      {
        speaker: 'Customer',
        text: 'Hi, I need help with my HVAC system. It\'s not working properly.',
        delay: 3000
      },
      {
        speaker: 'AI',
        text: 'I understand you\'re having issues with your HVAC system. Let me gather some information to help you. What type of problem are you experiencing?',
        delay: 2000
      },
      {
        speaker: 'Customer',
        text: 'It\'s making strange noises and not heating properly. I think it might be the furnace.',
        delay: 4000
      },
      {
        speaker: 'AI',
        text: 'I see. That sounds like it could be a serious issue that needs professional attention. What\'s your address so I can check our service area?',
        delay: 2000
      },
      {
        speaker: 'Customer',
        text: '123 Main Street, Anytown. When can you send someone out?',
        delay: 3000
      },
      {
        speaker: 'AI',
        text: 'Perfect! We do service that area. I can schedule a technician to come out tomorrow morning between 8-10 AM. Does that work for you?',
        delay: 2000
      },
      {
        speaker: 'Customer',
        text: 'Yes, that works great. How much will it cost?',
        delay: 2500
      },
      {
        speaker: 'AI',
        text: 'Our diagnostic fee is $89, and that will be applied to any repairs if you choose to proceed. I\'ll send you a confirmation text with all the details. What\'s your phone number?',
        delay: 2000
      },
      {
        speaker: 'Customer',
        text: '555-123-4567. Thank you!',
        delay: 2000
      },
      {
        speaker: 'AI',
        text: 'Perfect! You\'re all set for tomorrow morning 8-10 AM. Our technician will call 30 minutes before arrival. Thank you for choosing ' + businessInfo.businessName + '!',
        delay: 2000
      }
    ]

    messages.forEach((message, index) => {
      setTimeout(() => {
        setCallTranscript(prev => [...prev, message])
        
        if (index === messages.length - 1) {
          setTimeout(() => {
            setIsCallActive(false)
            setTestStatus('success')
            showSuccess('Test call completed successfully!')
          }, 1000)
        }
      }, message.delay + (index * 100))
    })
  }

  const handleTestCall = async () => {
    if (!businessInfo.isActive) {
      showError('Please complete your business setup first')
      return
    }
    
    simulateCall()
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'Not configured') return phone
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Test AI Agent</h1>
                <p className="text-gray-400">Test your AI receptionist with a simulated call</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Business Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Agent Configuration</h2>
              <p className="text-gray-400">Current AI agent settings</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Business Name</label>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                {businessInfo.businessName || 'Not configured'}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Phone Number</label>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                {formatPhoneNumber(businessInfo.phoneNumber)}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-400 block mb-2">Greeting Message</label>
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 min-h-[80px]">
                {businessInfo.greetingMessage || 'Not configured'}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              businessInfo.isActive 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {businessInfo.isActive ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {businessInfo.isActive ? 'Agent Active' : 'Setup Required'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Test Call Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Test Call Simulation</h2>
              <p className="text-gray-400">Experience how your AI agent handles customer calls</p>
            </div>
          </div>

          {!businessInfo.isActive && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-yellow-400 font-medium">Setup Required</p>
                  <p className="text-yellow-300 text-sm">Complete your business setup first to test your AI agent.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleTestCall}
              disabled={!businessInfo.isActive || isCallActive}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all ${
                businessInfo.isActive && !isCallActive
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isCallActive ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {isCallActive ? 'Call in Progress...' : 'Start Test Call'}
            </motion.button>

            {testStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Test completed successfully!</span>
              </div>
            )}
          </div>

          {/* Call Transcript */}
          {callTranscript.length > 0 && (
            <div className="bg-black/20 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold">Call Transcript</h3>
                {isCallActive && (
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm">Live</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {callTranscript.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 rounded-lg ${
                      message.speaker === 'AI'
                        ? 'bg-blue-500/20 border-l-4 border-blue-500'
                        : 'bg-green-500/20 border-l-4 border-green-500 ml-8'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        message.speaker === 'AI'
                          ? 'bg-blue-500/30 text-blue-300'
                          : 'bg-green-500/30 text-green-300'
                      }`}>
                        {message.speaker}
                      </span>
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-200">{message.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {!isCallActive && callTranscript.length === 0 && (
            <div className="text-center py-12">
              <Phone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Click &quot;Start Test Call&quot; to begin the simulation</p>
            </div>
          )}
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6"
        >
          <h3 className="font-semibold text-blue-400 mb-3">How the Test Works</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• The simulation shows how your AI agent would handle a real customer call</li>
            <li>• Watch how it qualifies leads, gathers information, and schedules appointments</li>
            <li>• This is a demo - your actual phone number will work the same way</li>
            <li>• Complete your setup to get a real phone number for customers to call</li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}