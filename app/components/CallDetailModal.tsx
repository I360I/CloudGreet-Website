'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, Clock, MapPin, DollarSign, MessageSquare, Play, Download, User } from 'lucide-react'

interface CallDetail {
  id: string
  from_number: string
  to_number: string
  duration: number
  status: 'answered' | 'missed' | 'busy' | 'failed' | 'completed'
  direction: 'inbound' | 'outbound'
  caller_name?: string
  caller_city?: string
  caller_state?: string
  service_requested?: string
  urgency?: string
  budget_mentioned?: number
  notes?: string
  follow_up_required: boolean
  recording_url?: string
  transcription_text?: string
  created_at: string
}

interface CallDetailModalProps {
  call: CallDetail | null
  isOpen: boolean
  onClose: () => void
}

export default function CallDetailModal({ call, isOpen, onClose }: CallDetailModalProps) {
  if (!call) return null

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered':
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'missed':
        return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'busy':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 lg:inset-16 bg-gray-900/95 border border-gray-800/50 rounded-2xl backdrop-blur-xl z-50 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Call Details</h2>
                    <p className="text-gray-400 text-sm">{call.from_number}</p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="w-8 h-8 bg-gray-800/50 border border-gray-700/50 rounded-lg flex items-center justify-center hover:bg-gray-700/50 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Call Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Call Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Duration:</span>
                          <span className="text-white">{formatDuration(call.duration)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(call.status)}`}>
                            {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Direction:</span>
                          <span className="text-white capitalize">{call.direction}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Time:</span>
                          <span className="text-white">
                            {new Date(call.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Caller Info */}
                    {(call.caller_name || call.caller_city || call.caller_state) && (
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Caller Information
                        </h3>
                        <div className="space-y-2 text-sm">
                          {call.caller_name && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Name:</span>
                              <span className="text-white">{call.caller_name}</span>
                            </div>
                          )}
                          {(call.caller_city || call.caller_state) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Location:</span>
                              <span className="text-white">
                                {[call.caller_city, call.caller_state].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Service Request */}
                    {call.service_requested && (
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Service Request
                        </h3>
                        <p className="text-gray-300 text-sm">{call.service_requested}</p>
                        {call.urgency && (
                          <div className="mt-2">
                            <span className="text-gray-400 text-xs">Urgency: </span>
                            <span className="text-white text-xs">{call.urgency}</span>
                          </div>
                        )}
                        {call.budget_mentioned && (
                          <div className="mt-2">
                            <span className="text-gray-400 text-xs">Budget: </span>
                            <span className="text-white text-xs">${call.budget_mentioned.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Follow Up */}
                    {call.follow_up_required && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <h3 className="font-semibold text-yellow-400 mb-2">Follow Up Required</h3>
                        <p className="text-yellow-300 text-sm">
                          This call requires follow-up action.
                        </p>
                      </div>
                    )}

                    {/* Recording */}
                    {call.recording_url && (
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                        <h3 className="font-semibold text-white mb-3">Recording</h3>
                        <div className="flex gap-2">
                          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors">
                            <Play className="w-4 h-4" />
                            Play
                          </button>
                          <button className="flex items-center gap-2 px-3 py-2 bg-gray-600/20 border border-gray-500/30 text-gray-400 rounded-lg hover:bg-gray-600/30 transition-colors">
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transcription */}
                {call.transcription_text && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                    <h3 className="font-semibold text-white mb-3">Transcription</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {call.transcription_text}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {call.notes && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                    <h3 className="font-semibold text-white mb-3">Notes</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {call.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}