'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, MessageSquare, Mail, AlertCircle, RefreshCw } from 'lucide-react'

interface VoiceFallbackSystemProps {
  businessName?: string
  businessPhone?: string
  businessEmail?: string
  onRetry?: () => void
}

export default function VoiceFallbackSystem({
  businessName = 'CloudGreet',
  businessPhone = '(555) 123-4567',
  businessEmail = 'support@cloudgreet.com',
  onRetry
}: VoiceFallbackSystemProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true)
      try {
        await onRetry()
      } finally {
        setIsRetrying(false)
      }
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Fallback Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-orange-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Voice System Temporarily Unavailable
        </h3>
        <p className="text-gray-400 text-sm">
          Don't worry! You can still reach us through these channels:
        </p>
      </motion.div>

      {/* Contact Options */}
      <div className="space-y-4">
        {/* Phone Call */}
        <motion.a
          href={`tel:${businessPhone}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 p-4 bg-green-600/20 border border-green-500/30 rounded-xl hover:bg-green-600/30 transition-all group"
        >
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
            <Phone className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white">Call Us</h4>
            <p className="text-green-400 text-sm">{businessPhone}</p>
          </div>
        </motion.a>

        {/* SMS */}
        <motion.a
          href={`sms:${businessPhone}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 p-4 bg-blue-600/20 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition-all group"
        >
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
            <MessageSquare className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white">Send SMS</h4>
            <p className="text-blue-400 text-sm">Text us directly</p>
          </div>
        </motion.a>

        {/* Email */}
        <motion.a
          href={`mailto:${businessEmail}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4 p-4 bg-purple-600/20 border border-purple-500/30 rounded-xl hover:bg-purple-600/30 transition-all group"
        >
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <Mail className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white">Email Us</h4>
            <p className="text-purple-400 text-sm">{businessEmail}</p>
          </div>
        </motion.a>
      </div>

      {/* Retry Button */}
      {onRetry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-gray-700/50 border border-gray-600 rounded-xl hover:bg-gray-700/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span className="font-medium">
              {isRetrying ? 'Retrying...' : 'Try Voice System Again'}
            </span>
          </button>
        </motion.div>
      )}

      {/* Help Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center"
      >
        <p className="text-xs text-gray-500">
          Our AI receptionist is powered by advanced voice technology.
          <br />
          If you continue having issues, please use the contact methods above.
        </p>
      </motion.div>
    </div>
  )
}
