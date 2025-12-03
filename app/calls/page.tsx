'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Clock, User, MessageSquare, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react'
import Link from 'next/link'
import CallPlayer from '@/app/components/CallPlayer'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { logger } from '@/lib/monitoring'
import { useToast } from '@/app/contexts/ToastContext'

interface CallLog {
  id: string
  call_id: string
  from_number: string
  to_number: string
  duration: number
  status: string
  recording_url?: string
  transcript?: string
  caller_name?: string
  created_at: string
}

export default function CallsPage() {
  const { showError } = useToast()
  const [calls, setCalls] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string>('')
  const [total, setTotal] = useState(0)
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    loadCalls()
  }, [offset, businessId])

  const loadCalls = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get businessId from dashboard data if not already set
      let targetBusinessId = businessId
      if (!targetBusinessId) {
        const dashboardResponse = await fetchWithAuth('/api/dashboard/data')
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json()
          if (dashboardData.businessId) {
            targetBusinessId = dashboardData.businessId
            setBusinessId(targetBusinessId)
          } else {
            setError('Business ID not found. Please complete onboarding.')
            setLoading(false)
            return
          }
        } else {
          setError('Failed to load business information')
          setLoading(false)
          return
        }
      }

      const response = await fetchWithAuth(`/api/calls/history?businessId=${businessId}&limit=${limit}&offset=${offset}`)
      
      if (response.ok) {
        const data = await response.json()
        setCalls(data.calls || [])
        setTotal(data.total || 0)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to load calls')
      }
    } catch (error) {
      logger.error('Error loading calls', { error })
      setError('Failed to load calls. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return 'No duration'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return 'Unknown'
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'answered':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'missed':
      case 'no_answer':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'busy':
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'answered':
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'missed':
      case 'no_answer':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'busy':
      case 'failed':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const downloadTranscript = async (call: CallLog) => {
    if (!call.transcript) {
      showError('No Transcript', 'No transcript available for this call')
      return
    }

    const blob = new Blob([call.transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `call-transcript-${call.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading && calls.length === 0) {
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

  if (error && calls.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Error Loading Calls</h2>
          <p className="text-base md:text-lg text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={loadCalls}
              className="w-full bg-blue-600 text-white py-3 px-6 min-h-[44px] rounded-xl font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Retry loading call logs"
            >
              Try Again
            </button>
            <Link
              href="/dashboard"
              className="w-full bg-gray-700 text-white py-3 px-6 min-h-[44px] rounded-xl font-semibold hover:bg-gray-600 transition-colors inline-block text-center focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-black"
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
                className="p-2 hover:bg-white/10 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-6 h-6 text-white" aria-hidden="true" />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">Call Logs</h1>
                <p className="text-gray-400 text-sm md:text-base">AI Receptionist Call History</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Phone className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">
                  {total} Total Calls
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
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">No Calls Yet</h2>
            <p className="text-base md:text-lg text-gray-400 mb-8 max-w-md mx-auto">
              Your AI receptionist is ready to handle calls. Call logs will appear here once customers start calling your business number.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 min-h-[44px] bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Return to dashboard"
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
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <Phone className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-white">
                        {formatPhoneNumber(call.from_number)}
                      </h3>
                      {call.caller_name && (
                        <p className="text-gray-400">{call.caller_name}</p>
                      )}
                      <p className="text-gray-500 text-sm">
                        {new Date(call.created_at).toLocaleDateString()} at {new Date(call.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(call.status)}`}>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(call.status)}
                        <span className="capitalize">{call.status || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                  
                  {call.recording_url && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">Recording Available</span>
                    </div>
                  )}
                  
                  {call.transcript && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <Download className="w-4 h-4" />
                      <button
                        onClick={() => downloadTranscript(call)}
                        className="text-sm text-blue-400 hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded"
                        aria-label={`Download transcript for call from ${formatPhoneNumber(call.from_number)}`}
                      >
                        Download Transcript
                      </button>
                    </div>
                  )}
                </div>

                {/* Call Player - Show when call is selected or if it has recording */}
                {(selectedCallId === call.id || (call.recording_url && selectedCallId === null && index === 0)) && call.recording_url && businessId && (
                  <div className="mb-4">
                    <CallPlayer
                      callId={call.id}
                      businessId={businessId}
                    />
                  </div>
                )}

                {/* Show/Hide Player Button */}
                {call.recording_url && businessId && (
                  <div className="mb-4">
                    <button
                      onClick={() => setSelectedCallId(selectedCallId === call.id ? null : call.id)}
                      className="text-sm text-blue-400 hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded"
                      aria-label={selectedCallId === call.id ? 'Hide call recording' : 'Show call recording'}
                    >
                      {selectedCallId === call.id ? 'Hide' : 'Show'} Recording
                    </button>
                  </div>
                )}

                {/* Transcript Preview */}
                {call.transcript && (
                  <div className="bg-gray-800/30 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-300">Transcript Preview</h4>
                      <button
                        onClick={() => downloadTranscript(call)}
                        className="text-xs text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded"
                        aria-label="Download full transcript"
                      >
                        Download Full
                      </button>
                    </div>
                    <p className="text-gray-300 text-sm line-clamp-3">
                      {call.transcript}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between pt-6">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-3 min-h-[44px] bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-black"
                  aria-label="Previous page of calls"
                >
                  Previous
                </button>
                <span className="text-gray-400 text-sm">
                  Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-4 py-3 min-h-[44px] bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-black"
                  aria-label="Next page of calls"
                >
                  Next
                </button>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}

