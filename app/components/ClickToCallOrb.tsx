"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Loader2, CheckCircle, X, Zap } from 'lucide-react'

interface ClickToCallOrbProps {
  businessName?: string
  businessType?: string
  services?: string
  hours?: string
}

export default function ClickToCallOrb({ 
  businessName = 'CloudGreet',
  businessType = 'AI Receptionist Service',
  services = 'AI phone answering, appointment scheduling, 24/7 support',
  hours = '24/7'
}: ClickToCallOrbProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isCalling, setIsCalling] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [status, setStatus] = useState('Ready to call')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [callSuccess, setCallSuccess] = useState(false)
  
  const phoneInputRef = useRef<HTMLInputElement>(null)

  // Phone number validation
  const isValidPhoneNumber = (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  // Initiate outbound call
  const initiateCall = async () => {
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number')
      return
    }

    setIsCalling(true)
    setError('')
    setStatus('Initiating call...')

    try {
      const response = await fetch('/api/click-to-call/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          businessName,
          businessType,
          services,
          hours
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call')
      }

      if (data.toll_free_number) {
        setStatus('Call our toll-free number!')
        setCallSuccess(true)
        
        // Reset after 8 seconds
        setTimeout(() => {
          setCallSuccess(false)
          setStatus('Ready to call')
          setIsCalling(false)
          setPhoneNumber('')
          setShowForm(false)
        }, 8000)
      } else {
        setStatus('Call initiated! Check your phone...')
        setCallSuccess(true)
        
        // Reset after 5 seconds
        setTimeout(() => {
          setCallSuccess(false)
          setStatus('Ready to call')
          setIsCalling(false)
          setPhoneNumber('')
          setShowForm(false)
        }, 5000)
      }

    } catch (error: any) {
      console.error('❌ Call initiation error:', error)
      setError(error.message || 'Failed to initiate call')
      setStatus('Call failed')
      setIsCalling(false)
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    initiateCall()
  }

  // Handle orb click
  const handleOrbClick = () => {
    if (isCalling) return
    
    if (!showForm) {
      setShowForm(true)
      setTimeout(() => phoneInputRef.current?.focus(), 100)
    } else if (phoneNumber && isValidPhoneNumber(phoneNumber)) {
      initiateCall()
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
            boxShadow: [
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
          className="absolute inset-4 rounded-full border-2 border-purple-400/30"
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
          className="absolute inset-8 rounded-full border border-purple-300/50"
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
          disabled={isCalling}
          className={`
            absolute inset-16 rounded-full flex items-center justify-center
            bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800
            shadow-2xl border border-white/20
            transition-all duration-300
            ${isCalling ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-105'}
            ${callSuccess ? 'bg-gradient-to-br from-green-600 to-emerald-600' : ''}
          `}
          whileHover={!isCalling ? { scale: 1.05 } : {}}
          whileTap={!isCalling ? { scale: 0.95 } : {}}
        >
          {/* Orb Content */}
          <div className="text-center">
            {isCalling ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-12 h-12 text-white mx-auto" />
              </motion.div>
            ) : callSuccess ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
              >
                <CheckCircle className="w-12 h-12 text-white mx-auto" />
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
          {!isCalling && !callSuccess && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-purple-400 rounded-full"
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
        {!isCalling && !callSuccess && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-purple-300 rounded-full"
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
            color: callSuccess ? '#10b981' : isCalling ? '#f59e0b' : '#ffffff'
          }}
        >
          {status}
        </motion.h3>
        
        {!showForm && !isCalling && !callSuccess && (
          <motion.p
            className="text-gray-400 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Click to call our AI receptionist
          </motion.p>
        )}
      </motion.div>

      {/* Phone Number Form */}
      <AnimatePresence>
        {showForm && !isCalling && !callSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-8 w-80 bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Your Phone Number
                </label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  required
                />
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm mt-2 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    {error}
                  </motion.p>
                )}
              </div>

              <div className="flex gap-3">
                <motion.button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setPhoneNumber('')
                    setError('')
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl border border-white/20 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                
                <motion.button
                  type="submit"
                  disabled={!phoneNumber || !isValidPhoneNumber(phoneNumber)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Zap className="w-4 h-4" />
                  Call Now
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {callSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-8 w-80 bg-green-600/20 backdrop-blur-xl border border-green-400/30 rounded-2xl p-6 shadow-2xl"
          >
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Call Our AI Now!</h3>
              <p className="text-green-300 mb-3">
                Call our toll-free number to speak with our AI receptionist:
              </p>
              <a 
                href="tel:+18333956731"
                className="text-2xl font-bold text-green-400 hover:text-green-300 transition-colors"
              >
                +1 (833) 395-6731
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
