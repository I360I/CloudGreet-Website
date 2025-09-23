"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Phone, PhoneCall, PhoneOff, Play, Pause, 
  Download, Search, Filter, Calendar, User, Clock, 
  MessageSquare, CheckCircle, XCircle, AlertTriangle, 
  Star, Eye, MoreVertical, RefreshCw, Volume2, Zap,
  TrendingUp, BarChart3, FileText, MapPin
} from 'lucide-react'
import Link from 'next/link'

export default function CallsPage() {
  const [calls, setCalls] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedCall, setSelectedCall] = useState(null)
  const [showCallDetail, setShowCallDetail] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    fetchCalls()
  }, [])

  const fetchCalls = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      const response = await fetch('/api/calls/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCalls(data.calls || [])
      } else {
        // Console error removed for production
      }
    } catch (error) {
      // Console error removed for production
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCalls = calls.filter(call => {
    const matchesSearch = searchTerm === '' || 
                          call.from_number?.includes(searchTerm) ||
                          call.to_number?.includes(searchTerm) ||
                          call.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          call.transcript?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || call.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20'
      case 'missed': return 'text-red-400 bg-red-500/20'
      case 'in-progress': return 'text-blue-400 bg-blue-500/20'
      case 'emergency': return 'text-orange-400 bg-orange-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'missed': return <XCircle className="w-4 h-4" />
      case 'in-progress': return <PhoneCall className="w-4 h-4" />
      case 'emergency': return <AlertTriangle className="w-4 h-4" />
      default: return <Phone className="w-4 h-4" />
    }
  }

  const openCallDetail = (call) => {
    setSelectedCall(call)
    setShowCallDetail(true)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }

  const closeCallDetail = () => {
    setShowCallDetail(false)
    setSelectedCall(null)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate call statistics
  const totalCalls = calls.length
  const completedCalls = calls.filter(call => call.status === 'completed').length
  const missedCalls = calls.filter(call => call.status === 'missed').length
  const avgDuration = calls.length > 0 
    ? Math.round(calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length)
    : 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Loading Calls</h2>
          <p className="text-gray-400">Fetching your call history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-purple-500/20 backdrop-blur-xl bg-black/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">Call History</h1>
            </Link>
            <motion.button
              onClick={fetchCalls}
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.3 }}
              className="p-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
              title="Refresh Calls"
            >
              <RefreshCw className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Call Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Phone className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Total Calls</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalCalls}</p>
            <p className="text-gray-400 text-sm">All time</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Completed</h3>
            </div>
            <p className="text-3xl font-bold text-white">{completedCalls}</p>
            <p className="text-gray-400 text-sm">{totalCalls > 0 ? Math.round((completedCalls/totalCalls)*100) : 0}% success rate</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <XCircle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Missed</h3>
            </div>
            <p className="text-3xl font-bold text-white">{missedCalls}</p>
            <p className="text-gray-400 text-sm">{totalCalls > 0 ? Math.round((missedCalls/totalCalls)*100) : 0}% missed rate</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Avg Duration</h3>
            </div>
            <p className="text-3xl font-bold text-white">{formatDuration(avgDuration)}</p>
            <p className="text-gray-400 text-sm">Per call</p>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search calls by number, name, or transcript..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div className="flex gap-3">
              {['all', 'completed', 'missed', 'in-progress', 'emergency'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                    filterStatus === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  {status.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Calls List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 overflow-hidden"
        >
          {filteredCalls.length > 0 ? (
            <div className="divide-y divide-gray-700/50">
              {filteredCalls.map((call, index) => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-700/30 transition-colors cursor-pointer"
                  onClick={() => openCallDetail(call)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        call.status === 'completed' ? 'bg-green-500/20 border border-green-500/30' :
                        call.status === 'missed' ? 'bg-red-500/20 border border-red-500/30' :
                        call.status === 'in-progress' ? 'bg-blue-500/20 border border-blue-500/30' :
                        'bg-orange-500/20 border border-orange-500/30'
                      }`}>
                        {getStatusIcon(call.status)}
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {call.customer_name || call.from_number || 'Unknown Caller'}
                        </h3>
                        <p className="text-gray-400">
                          {call.from_number} • {call.service || 'General Service'}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {formatDate(call.created_at || call.timestamp)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(call.status)}`}>
                          {getStatusIcon(call.status)}
                          {call.status}
                        </span>
                      </div>
                      <p className="text-white font-semibold">
                        {call.revenue ? `$${call.revenue}` : call.estimated_value ? `$${call.estimated_value}` : '$0'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {formatDuration(call.duration || 0)}
                      </p>
                    </div>
                  </div>
                  
                  {call.transcript && (
                    <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {call.transcript.substring(0, 150)}...
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Phone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No Calls Found</h3>
              <p className="text-gray-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No calls match your current filters.' 
                  : 'Your AI receptionist hasn\'t received any calls yet.'}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Call Detail Modal */}
      <AnimatePresence>
        {showCallDetail && selectedCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeCallDetail}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Call Details</h2>
                  <button
                    onClick={closeCallDetail}
                    className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Call Information */}
                  <div className="space-y-6">
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Call Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Caller:</span>
                          <span className="text-white">{selectedCall.customer_name || selectedCall.from_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Phone:</span>
                          <span className="text-white">{selectedCall.from_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date:</span>
                          <span className="text-white">{formatDate(selectedCall.created_at || selectedCall.timestamp)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Duration:</span>
                          <span className="text-white">{formatDuration(selectedCall.duration || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(selectedCall.status)}`}>
                            {getStatusIcon(selectedCall.status)}
                            {selectedCall.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Revenue:</span>
                          <span className="text-white font-semibold">
                            ${selectedCall.revenue || selectedCall.estimated_value || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Audio Player */}
                    {selectedCall.recording_url && (
                      <div className="bg-gray-700/30 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Call Recording</h3>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={togglePlayPause}
                            className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors"
                          >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm text-gray-400 mb-1">
                              <span>{formatDuration(currentTime)}</span>
                              <span>{formatDuration(duration)}</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                          <button className="p-2 text-gray-400 hover:text-white transition-colors">
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                        <audio
                          ref={audioRef}
                          src={selectedCall.recording_url}
                          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Transcript */}
                  <div className="space-y-6">
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Call Transcript</h3>
                      {selectedCall.transcript ? (
                        <div className="bg-gray-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          <p className="text-gray-300 whitespace-pre-wrap">{selectedCall.transcript}</p>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">No transcript available for this call.</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
                      <div className="space-y-3">
                        <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                          <Phone className="w-4 h-4" />
                          Call Back
                        </button>
                        <button className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Send SMS
                        </button>
                        <button className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Schedule Follow-up
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}