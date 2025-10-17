'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Mail, MessageCircle, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface VoiceFallbackSystemProps {
  businessName: string
  businessPhone: string
  businessEmail: string
  onRetry: () => void
}

export default function VoiceFallbackSystem({
  businessName,
  businessPhone,
  businessEmail,
  onRetry
}: VoiceFallbackSystemProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const contactOptions = [
    {
      id: 'phone',
      title: 'Call Directly',
      description: 'Speak with our team directly',
      icon: Phone,
      action: () => {
        window.open(`tel:${businessPhone}`, '_self')
        setShowSuccess(true)
      },
      details: businessPhone,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30'
    },
    {
      id: 'email',
      title: 'Send Email',
      description: 'Get a response within 24 hours',
      icon: Mail,
      action: () => {
        window.open(`mailto:${businessEmail}?subject=Inquiry from ${businessName}`, '_blank')
        setShowSuccess(true)
      },
      details: businessEmail,
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30'
    },
    {
      id: 'sms',
      title: 'Text Message',
      description: 'Quick questions and scheduling',
      icon: MessageCircle,
      action: () => {
        window.open(`sms:${businessPhone}`, '_self')
        setShowSuccess(true)
      },
      details: businessPhone,
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    }
  ]

  const handleRetry = () => {
    setSelectedOption(null)
    setShowSuccess(false)
    onRetry()
  }

  if (showSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-green-400" />
        </motion.div>
        
        <h3 className="text-2xl font-bold text-white mb-4">Contact Method Activated</h3>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          We've opened your preferred contact method. Our team will be in touch soon!
        </p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setShowSuccess(false)}
            className="px-6 py-3 bg-gray-600/20 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-600/30 transition-all"
          >
            Try Another Method
          </button>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Voice Demo
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="text-center py-8">
      {/* Error Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <AlertCircle className="w-8 h-8 text-red-400" />
        </motion.div>
        
        <h3 className="text-2xl font-bold text-white mb-2">Voice System Unavailable</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          We're having technical difficulties with our voice system. 
          Don't worry - we have other ways to help you!
        </p>
      </motion.div>

      {/* Contact Options */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4 max-w-2xl mx-auto"
      >
        <h4 className="text-lg font-semibold text-white mb-6">Choose Your Preferred Contact Method</h4>
        
        <div className="grid gap-4">
          {contactOptions.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              onClick={option.action}
              className={`${option.bgColor} ${option.borderColor} border rounded-xl p-6 text-left hover:scale-[1.02] transition-all group`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-4">
                <div className={`bg-gradient-to-r ${option.color} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                  <option.icon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1">
                  <h5 className="text-lg font-semibold text-white mb-1">{option.title}</h5>
                  <p className="text-gray-400 text-sm mb-2">{option.description}</p>
                  <p className="text-gray-300 text-sm font-mono">{option.details}</p>
                </div>
                
                <div className="text-gray-400 group-hover:text-white transition-colors">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Retry Button */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8"
      >
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 hover:text-blue-200 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Voice Demo Again
        </button>
      </motion.div>

      {/* Additional Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 text-center"
      >
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Having trouble with our voice system? This could be due to browser compatibility, 
          microphone permissions, or network connectivity. Our alternative contact methods 
          are always available for immediate assistance.
        </p>
      </motion.div>
    </div>
  )
}