"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TestAgentSimplePage() {
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    businessType: '',
    services: '',
    hours: '',
    phoneNumber: ''
  })

  const [testPhone, setTestPhone] = useState('')
  const [isCalling, setIsCalling] = useState(false)
  const [callStatus, setCallStatus] = useState('')

  const formatBusinessHours = (hours: any) => {
    if (!hours) return 'Not set'
    const firstDay = Object.values(hours)[0] as any
    if (!firstDay) return 'Not set'
    
    // Format hours display
    return 'Mon-Fri: 9am-5pm' // Simplified for now
  }

  // Load business info from API
  useEffect(() => {
    fetchWithAuth('/api/business/profile')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          const business = data.business || data.data
          setBusinessInfo({
            businessName: business?.business_name || business?.businessName || '',
            businessType: business?.business_type || business?.businessType || '',
            services: business?.services?.join(', ') || '',
            hours: formatBusinessHours(business?.business_hours || business?.businessHours),
            phoneNumber: business?.phone_number || business?.phoneNumber || ''
          })
        }
      })
      .catch(err => console.error('Failed to load business info:', err))
  }, [])


  const initiateTestCall = async () => {
    if (!testPhone || !businessInfo.phoneNumber) {
      setCallStatus('Please enter a phone number')
      return
    }

    setIsCalling(true)
    setCallStatus('Initiating real-time AI call...')

    try {
      const response = await fetchWithAuth('/api/test/realtime-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: testPhone,
          businessId: localStorage.getItem('businessId') // businessId is non-sensitive, can stay in localStorage
        })
      })

      const data = await response.json()

      if (data.success) {
        setCallStatus(`✅ Test call initiated! You should receive a call at ${testPhone} shortly. The AI will use real-time conversation.`)
      } else {
        setCallStatus(`❌ Call failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
      setCallStatus('❌ Failed to initiate call. Please try again.')
    } finally {
      setIsCalling(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-gray-800/50 backdrop-blur-md bg-black/20 sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="flex items-center text-white hover:text-blue-400 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Test Your AI Receptionist
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            To test your AI receptionist, call your business phone number. The AI will answer and have a real conversation with you.
          </p>
        </motion.div>

        {/* Business Info Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h3 className="text-lg font-semibold mb-4 text-white">Your Business Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Business Name:</span>
              <span className="ml-2 text-white font-medium">{businessInfo.businessName}</span>
            </div>
            <div>
              <span className="text-gray-400">Type:</span>
              <span className="ml-2 text-white font-medium">{businessInfo.businessType}</span>
            </div>
            <div>
              <span className="text-gray-400">Services:</span>
              <span className="ml-2 text-white font-medium">{businessInfo.services}</span>
            </div>
            <div>
              <span className="text-gray-400">Hours:</span>
              <span className="ml-2 text-white font-medium">{businessInfo.hours}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            The AI will use this information during conversations. Update in Settings.
          </p>
        </motion.div>

        {/* Real-Time Call Testing */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-center max-w-md w-full">
            <div className="text-4xl font-bold text-white mb-4">
              🤖 Real-Time AI Test
            </div>
            <div className="text-xl text-blue-100 mb-6">
              Test your AI with a real phone call
            </div>
            
            {/* Phone Number Input */}
            <div className="mb-6">
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full bg-black/20 border border-white/30 rounded-lg px-4 py-3 text-white text-center text-lg font-mono placeholder-gray-400"
              />
            </div>

            {/* Test Call Button */}
            <button
              onClick={initiateTestCall}
              disabled={isCalling || !testPhone}
              className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed border border-white/30 rounded-lg px-6 py-4 text-white font-semibold transition-all duration-300 mb-4"
            >
              {isCalling ? '🔄 Initiating Call...' : '📞 Start Real-Time AI Call'}
            </button>

            {/* Status Message */}
            {callStatus && (
              <div className="text-sm text-blue-200 bg-black/20 rounded-lg p-3">
                {callStatus}
              </div>
            )}

            <div className="text-sm text-blue-200 mt-4">
              Uses real-time AI (sub-300ms responses)
            </div>
          </div>
        </motion.div>

        {/* Real-Time AI Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-green-500/10 border border-green-500/30 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4 text-green-400">🚀 Real-Time AI Features</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✓ Sub-300ms response time (latest OpenAI Realtime API)</li>
            <li>✓ Natural conversation flow with interruptions</li>
            <li>✓ Real-time appointment booking</li>
            <li>✓ Automatic lead qualification</li>
            <li>✓ Business-specific knowledge and tone</li>
            <li>✓ Professional voice synthesis</li>
            <li>✓ No fallbacks - pure real-time AI</li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

