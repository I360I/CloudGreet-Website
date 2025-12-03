"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { logger } from '@/lib/monitoring'
import RingOrb from '@/app/components/RingOrb'
import { useToast } from '@/app/contexts/ToastContext'
import type { BusinessHours, DayHours } from '@/lib/types/business-hours'

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
  const [businessId, setBusinessId] = useState<string | null>(null)
  const { showError, showSuccess, showInfo } = useToast()

  const formatBusinessHours = (hours: BusinessHours | null | undefined): string => {
    if (!hours) return 'Not set'
    
    const days = Object.values(hours).filter((day): day is DayHours => 
      day !== undefined && typeof day === 'object' && 'open' in day && 'close' in day
    )
    
    if (days.length === 0) return 'Not set'
    
    // Find first enabled day
    const firstDay = days.find(day => !day.closed && day.enabled !== false)
    if (!firstDay) return 'Not set'
    
    // Format hours display (simplified - could be enhanced)
    return `${firstDay.open} - ${firstDay.close}`
  }

  // Load business info from API
  useEffect(() => {
    const loadBusinessInfo = async () => {
      try {
        const response = await fetchWithAuth('/api/business/profile')
        
        if (!response.ok) {
          throw new Error(`Failed to load business info (${response.status})`)
        }
        
        const data = await response.json()
        if (data.success) {
          const business = data.business || data.data
          setBusinessId(business?.id || null)
          setBusinessInfo({
            businessName: business?.business_name || business?.businessName || '',
            businessType: business?.business_type || business?.businessType || '',
            services: business?.services?.join(', ') || '',
            hours: formatBusinessHours(business?.business_hours || business?.businessHours),
            phoneNumber: business?.phone_number || business?.phoneNumber || ''
          })
        } else {
          throw new Error(data.error || 'Failed to load business information')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logger.error('Failed to load business info', { error: errorMessage })
        showError('Failed to Load Business Info', 'Unable to load business information. Please try refreshing the page.')
      }
    }
    
    loadBusinessInfo()
  }, [showError])


  const initiateTestCall = async () => {
    if (!testPhone || !businessInfo.phoneNumber) {
      const errorMessage = 'Please enter a phone number and ensure business phone is set'
      setCallStatus(errorMessage)
      showError('Phone Number Required', errorMessage)
      return
    }

    setIsCalling(true)
    setCallStatus('Initiating real-time AI call...')
    showInfo('Initiating call...', `Calling ${testPhone} from ${businessInfo.phoneNumber}`)

    try {
      const response = await fetchWithAuth('/api/test/realtime-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: testPhone,
          businessId: businessId
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const successMessage = `Test call initiated! You should receive a call at ${testPhone} shortly. The AI will use real-time conversation.`
        setCallStatus(successMessage)
        showSuccess('Call Initiated!', `You should receive a call at ${testPhone} shortly.`)
      } else {
        const errorMessage = data.error || data.message || 'Failed to initiate call'
        setCallStatus(`Call failed: ${errorMessage}`)
        showError('Call Failed', errorMessage)
        logger.error('Test call failed', {
          error: errorMessage,
          phoneNumber: testPhone,
          businessId
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call. Please try again.'
      setCallStatus(`Failed to initiate call: ${errorMessage}`)
      showError('Network Error', errorMessage)
      logger.error('Failed to initiate test call', { 
        error: errorMessage,
        phoneNumber: testPhone,
        businessId
      })
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
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Test Your AI Receptionist
          </h1>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
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
          <h3 className="text-xl md:text-2xl font-semibold mb-4 text-white">Your Business Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base">
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
          <p className="text-xs md:text-sm text-gray-500 mt-4">
            The AI will use this information during conversations. Update in Settings.
          </p>
        </motion.div>

        {/* Real-Time Call Testing */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center items-center flex-col"
        >
          {/* RingOrb Component */}
          <div className="relative mb-8">
            <RingOrb />
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md w-full">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Phone className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Real-Time AI Test
              </h2>
            </div>
            <p className="text-base md:text-lg text-gray-300 mb-6">
              Test your AI with a real phone call
            </p>
            
            {/* Phone Number Input */}
            <div className="mb-6">
              <label htmlFor="testAgentPhoneInput" className="sr-only">
                Your phone number for test call
              </label>
              <input
                type="tel"
                id="testAgentPhoneInput"
                name="phone"
                placeholder="Enter your phone number"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                aria-label="Phone number for test call"
                aria-describedby="testAgentPhoneDescription"
                aria-required="true"
                aria-invalid={!!callStatus && (callStatus.includes('Failed') || callStatus.includes('❌'))}
                className="w-full bg-black/20 border border-white/30 rounded-lg px-4 py-3 text-white text-center text-base md:text-lg font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p id="testAgentPhoneDescription" className="sr-only">
                Enter your phone number to receive a test call from your AI receptionist
              </p>
            </div>

            {/* Test Call Button */}
            <button
              onClick={initiateTestCall}
              disabled={isCalling || !testPhone}
              aria-label={isCalling ? 'Initiating call' : 'Start real-time AI call'}
              aria-busy={isCalling}
              aria-describedby="testCallButtonDescription"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg px-6 py-4 text-white font-semibold transition-all duration-300 mb-4 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black"
            >
              {isCalling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Initiating Call...</span>
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" aria-hidden="true" />
                  <span>Start Real-Time AI Call</span>
                </>
              )}
            </button>
            <p id="testCallButtonDescription" className="sr-only">
              Click to initiate a real-time AI test call to your phone number
            </p>

            {/* Status Message */}
            {callStatus && (
              <div 
                className={`text-sm rounded-lg p-3 mb-4 flex items-center gap-2 ${
                  callStatus.includes('failed') || callStatus.includes('Failed') || callStatus.includes('❌')
                    ? 'text-red-300 bg-red-500/10 border border-red-500/30'
                    : 'text-green-300 bg-green-500/10 border border-green-500/30'
                }`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {callStatus.includes('failed') || callStatus.includes('Failed') || callStatus.includes('❌') ? (
                  <span className="text-red-400" aria-hidden="true">✕</span>
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" aria-hidden="true" />
                )}
                <span>{callStatus}</span>
              </div>
            )}

            <div className="text-sm md:text-base text-gray-400 mt-4">
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
          <h3 className="text-xl md:text-2xl font-semibold mb-4 text-green-400 flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Real-Time AI Features
          </h3>
          <ul className="space-y-2 text-sm md:text-base text-gray-300">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>Sub-300ms response time (latest OpenAI Realtime API)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>Natural conversation flow with interruptions</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>Real-time appointment booking</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>Automatic lead qualification</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>Business-specific knowledge and tone</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>Professional voice synthesis</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>No fallbacks - pure real-time AI</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}

