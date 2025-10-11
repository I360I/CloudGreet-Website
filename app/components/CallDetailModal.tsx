'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Phone, Clock, Calendar, User, MapPin, DollarSign, 
  MessageSquare, CheckCircle, AlertCircle, Play, Download 
} from 'lucide-react'

interface CallDetailModalProps {
  isOpen: boolean
  onClose: () => void
  callId: string | null
}

interface CallDetails {
  id: string
  caller: string
  callerPhone: string
  duration: string
  date: string
  time: string
  status: string
  transcript?: string
  recording_url?: string
  ai_summary?: string
  booking_made?: boolean
  estimated_value?: number
  customer_location?: string
  service_requested?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export default function CallDetailModal({ isOpen, onClose, callId }: CallDetailModalProps) {
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playingAudio, setPlayingAudio] = useState(false)

  useEffect(() => {
    if (isOpen && callId) {
      fetchCallDetails()
    }
  }, [isOpen, callId])

  const fetchCallDetails = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch(`/api/calls?call_id=${callId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setCallDetails(data.data)
        } else {
          setError('Call not found')
        }
      } else {
        setError('Failed to load call details')
      }
    } catch (err) {
      console.error('Error fetching call details:', err)
      setError('Failed to load call details')
    } finally {
      setIsLoading(false)
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'negative': return 'text-red-400 bg-red-500/20 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'missed': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'voicemail': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-3xl bg-gray-900 rounded-2xl shadow-2xl border border-white/10 z-50 max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Call Details</h2>
                  <p className="text-sm text-gray-400">
                    {callDetails?.caller || 'Loading...'}
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-400">{error}</p>
                </div>
              ) : callDetails ? (
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Clock className="w-4 h-4" />
                        Duration
                      </div>
                      <div className="text-lg font-bold text-white">{callDetails.duration}</div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        Date
                      </div>
                      <div className="text-lg font-bold text-white">{callDetails.date}</div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        Status
                      </div>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(callDetails.status)}`}>
                        {callDetails.status}
                      </div>
                    </div>

                    {callDetails.estimated_value && (
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                          <DollarSign className="w-4 h-4" />
                          Value
                        </div>
                        <div className="text-lg font-bold text-green-400">
                          ${callDetails.estimated_value}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Customer Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{callDetails.caller}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{callDetails.callerPhone}</span>
                      </div>
                      {callDetails.customer_location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-white">{callDetails.customer_location}</span>
                        </div>
                      )}
                      {callDetails.service_requested && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                          <span className="text-white">Service: {callDetails.service_requested}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Summary */}
                  {callDetails.ai_summary && (
                    <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        AI Summary
                      </h3>
                      <p className="text-white text-sm leading-relaxed">{callDetails.ai_summary}</p>
                    </div>
                  )}

                  {/* Booking Made */}
                  {callDetails.booking_made && (
                    <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">Appointment Booked</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-2">
                        This call resulted in a successful booking
                      </p>
                    </div>
                  )}

                  {/* Recording */}
                  {callDetails.recording_url && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Call Recording
                      </h3>
                      <audio 
                        controls 
                        className="w-full"
                        style={{
                          filter: 'invert(0.9) hue-rotate(180deg)'
                        }}
                      >
                        <source src={callDetails.recording_url} type="audio/mpeg" />
                        Your browser does not support audio playback.
                      </audio>
                      <a
                        href={callDetails.recording_url}
                        download
                        className="inline-flex items-center gap-2 mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Recording
                      </a>
                    </div>
                  )}

                  {/* Transcript */}
                  {callDetails.transcript && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">Full Transcript</h3>
                      <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                          {callDetails.transcript}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Call ID: {callId}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

