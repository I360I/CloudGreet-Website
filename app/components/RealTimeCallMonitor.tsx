'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Clock, 
  User, 
  MapPin, 
  MessageSquare,
  Volume2,
  Mic,
  MicOff,
  Play,
  Pause,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Activity,
  TrendingUp
} from 'lucide-react'

interface Call {
  id: string
  fromNumber: string
  toNumber: string
  status: 'ringing' | 'connected' | 'ended' | 'missed' | 'voicemail'
  duration: number
  startTime: Date
  endTime?: Date
  callerName?: string
  callerLocation?: string
  callerInfo?: {
    name: string
    location: string
    previousCalls: number
    lastCallDate?: Date
  }
  transcript?: string
  summary?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  intent?: string
  nextAction?: string
  recordingUrl?: string
  quality?: {
    audioQuality: 'excellent' | 'good' | 'poor'
    latency: number
    packetLoss: number
  }
}

interface RealTimeCallMonitorProps {
  businessId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function RealTimeCallMonitor({ 
  businessId = 'default',
  autoRefresh = true,
  refreshInterval = 2000
}: RealTimeCallMonitorProps) {
  const [calls, setCalls] = useState<Call[]>([])
  const [activeCalls, setActiveCalls] = useState<Call[]>([])
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [stats, setStats] = useState({
    totalToday: 0,
    activeNow: 0,
    answeredToday: 0,
    missedToday: 0,
    avgDuration: 0,
    satisfaction: 0
  })

  const eventSourceRef = useRef<EventSource | null>(null)

  // Fetch calls data
  const fetchCalls = async () => {
    try {
      const response = await fetch(`/api/calls/realtime?businessId=${businessId}`)
      const data = await response.json()
      
      if (data.success) {
        setCalls(data.calls || [])
        setActiveCalls(data.activeCalls || [])
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Failed to fetch calls:', error)
    }
  }

  // Connect to real-time updates
  const connectToRealTime = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`/api/calls/stream?businessId=${businessId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'call_started':
            setActiveCalls(prev => [...prev, data.call])
            setCalls(prev => [data.call, ...prev])
            break
            
          case 'call_ended':
            setActiveCalls(prev => prev.filter(call => call.id !== data.callId))
            setCalls(prev => prev.map(call => 
              call.id === data.callId ? { ...call, ...data.updates } : call
            ))
            break
            
          case 'call_updated':
            setCalls(prev => prev.map(call => 
              call.id === data.callId ? { ...call, ...data.updates } : call
            ))
            setActiveCalls(prev => prev.map(call => 
              call.id === data.callId ? { ...call, ...data.updates } : call
            ))
            break
            
          case 'stats_updated':
            setStats(data.stats)
            break
        }
      } catch (error) {
        console.error('Failed to parse real-time data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Real-time connection error:', error)
      // Attempt to reconnect after 5 seconds
      setTimeout(connectToRealTime, 5000)
    }
  }

  useEffect(() => {
    fetchCalls()
    
    if (autoRefresh) {
      connectToRealTime()
      
      const interval = setInterval(fetchCalls, refreshInterval)
      return () => {
        clearInterval(interval)
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }
      }
    }
  }, [businessId, autoRefresh, refreshInterval])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPhoneNumber = (number: string) => {
    const cleaned = number.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return number
  }

  const getCallStatusColor = (status: Call['status']) => {
    switch (status) {
      case 'ringing':
        return 'text-yellow-600 bg-yellow-100'
      case 'connected':
        return 'text-green-600 bg-green-100'
      case 'ended':
        return 'text-gray-600 bg-gray-100'
      case 'missed':
        return 'text-red-600 bg-red-100'
      case 'voicemail':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getCallStatusIcon = (status: Call['status']) => {
    switch (status) {
      case 'ringing':
        return <Phone className="w-4 h-4 animate-pulse" />
      case 'connected':
        return <PhoneCall className="w-4 h-4" />
      case 'ended':
        return <PhoneOff className="w-4 h-4" />
      case 'missed':
        return <PhoneOff className="w-4 h-4" />
      case 'voicemail':
        return <MessageSquare className="w-4 h-4" />
      default:
        return <Phone className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Today's Calls</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Now</p>
              <p className="text-xl font-bold text-gray-900">{stats.activeNow}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Answered</p>
              <p className="text-xl font-bold text-gray-900">{stats.answeredToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Missed</p>
              <p className="text-xl font-bold text-gray-900">{stats.missedToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Duration</p>
              <p className="text-xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Satisfaction</p>
              <p className="text-xl font-bold text-gray-900">{stats.satisfaction.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Calls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600">
                {autoRefresh ? 'Live' : 'Paused'}
              </span>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {calls.slice(0, 10).map((call) => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`bg-white rounded-lg p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all ${
                    selectedCall?.id === call.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedCall(call)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getCallStatusIcon(call.status)}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {call.callerName || 'Unknown Caller'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatPhoneNumber(call.fromNumber)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCallStatusColor(call.status)}`}>
                        {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDuration(call.duration)}
                      </p>
                    </div>
                  </div>

                  {call.callerLocation && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <MapPin className="w-3 h-3" />
                      {call.callerLocation}
                    </div>
                  )}

                  {call.intent && (
                    <div className="text-sm text-gray-700">
                      <strong>Intent:</strong> {call.intent}
                    </div>
                  )}

                  {call.quality && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className={`flex items-center gap-1 ${
                        call.quality.audioQuality === 'excellent' ? 'text-green-600' :
                        call.quality.audioQuality === 'good' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        <Volume2 className="w-3 h-3" />
                        {call.quality.audioQuality}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {call.quality.latency}ms
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Call Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Call Details</h3>
          
          {selectedCall ? (
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="space-y-4">
                {/* Caller Info */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Caller Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedCall.callerName || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Number:</span>
                      <span className="font-medium">{formatPhoneNumber(selectedCall.fromNumber)}</span>
                    </div>
                    {selectedCall.callerLocation && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">{selectedCall.callerLocation}</span>
                      </div>
                    )}
                    {selectedCall.callerInfo?.previousCalls && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Previous Calls:</span>
                        <span className="font-medium">{selectedCall.callerInfo.previousCalls}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Call Summary */}
                {selectedCall.summary && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Call Summary</h4>
                    <p className="text-sm text-gray-700">{selectedCall.summary}</p>
                  </div>
                )}

                {/* Next Action */}
                {selectedCall.nextAction && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Next Action</h4>
                    <p className="text-sm text-gray-700">{selectedCall.nextAction}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedCall.recordingUrl && (
                    <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                      <Play className="w-4 h-4" />
                      Play
                    </button>
                  )}
                  <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 shadow-sm border text-center">
              <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Select a call to view details</p>
            </div>
          )}

          {/* Transcript Modal */}
          {showTranscript && selectedCall?.transcript && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Call Transcript</h3>
                  <button
                    onClick={() => setShowTranscript(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedCall.transcript}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
