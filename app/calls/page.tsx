'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Clock, User, MapPin, DollarSign, MessageSquare, CheckCircle, XCircle, AlertCircle, Play, Pause, Volume2, FileText, Download } from 'lucide-react'
import Link from 'next/link'
import CallPlayer from '../components/CallPlayer'

interface CallLog {
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

export default function CallsPage() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingCallId, setPlayingCallId] = useState<string | null>(null)
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})

  useEffect(() => {
    loadCalls()
  }, [])

  const loadCalls = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to view calls')
        return
      }

      const response = await fetch('/api/calls', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCalls(data.calls || [])
      } else {
        setError('Failed to load calls')
      }
    } catch (err) {
      setError('Network error loading calls')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'answered':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'missed':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'busy':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered':
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'missed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'busy':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const toggleAudio = (callId: string) => {
    const audio = audioRefs.current[callId]
    if (!audio) return

    if (playingCallId === callId) {
      audio.pause()
      setPlayingCallId(null)
    } else {
      // Pause any currently playing audio
      Object.values(audioRefs.current).forEach(a => a?.pause())
      audio.play()
      setPlayingCallId(callId)
    }
  }

  const toggleTranscript = (callId: string) => {
    setExpandedTranscript(expandedTranscript === callId ? null : callId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-white text-lg">Loading call logs...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Calls</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={loadCalls}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/dashboard"
              className="w-full bg-gray-700 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-600 transition-colors inline-block text-center"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Call Logs</h1>
                <p className="text-gray-400 text-sm">AI Receptionist Call History</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 rounded-xl border border-green-500/30">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-400">
                  {calls.length} Total Calls
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {calls.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-blue-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Phone className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">No Calls Yet</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Your AI receptionist is ready to handle calls. Call logs will appear here once customers start calling your business number.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {calls.map((call, index) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <Phone className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {formatPhoneNumber(call.from_number)}
                      </h3>
                      {call.caller_name && (
                        <p className="text-gray-400">{call.caller_name}</p>
                      )}
                      {(call.caller_city || call.caller_state) && (
                        <p className="text-gray-500 text-sm">
                          {call.caller_city && call.caller_state 
                            ? `${call.caller_city}, ${call.caller_state}`
                            : call.caller_city || call.caller_state
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(call.status)}`}>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(call.status)}
                        <span className="capitalize">{call.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {call.duration > 0 ? formatDuration(call.duration) : 'No duration'}
                    </span>
                  </div>
                  
                  {call.service_requested && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">{call.service_requested}</span>
                    </div>
                  )}
                  
                  {call.budget_mentioned && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">${call.budget_mentioned}</span>
                    </div>
                  )}
                </div>

                {call.notes && (
                  <div className="bg-gray-800/30 rounded-xl p-4 mb-4">
                    <p className="text-gray-300 text-sm">{call.notes}</p>
                  </div>
                )}

                {/* Call Player */}
                {call.recording_url && (
                  <div className="mb-4">
                    <CallPlayer
                      recordingUrl={call.recording_url}
                      callId={call.id}
                      callerName={call.caller_name}
                      callerPhone={call.from_number}
                      duration={call.duration}
                      timestamp={new Date(call.created_at).toLocaleString()}
                      transcript={call.transcription_text}
                    />
                  </div>
                )}


                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {new Date(call.created_at).toLocaleDateString()} at {new Date(call.created_at).toLocaleTimeString()}
                  </span>
                  {call.follow_up_required && (
                    <span className="text-yellow-400 font-medium">Follow-up required</span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  )
}
