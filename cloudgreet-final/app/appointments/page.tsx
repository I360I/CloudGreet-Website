"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Calendar, Clock, User, MapPin, Phone, 
  Edit, Trash2, Plus, Search, Filter, CheckCircle,
  XCircle, AlertTriangle, Eye, RefreshCw, Zap,
  TrendingUp, BarChart3, FileText, MessageSquare
} from 'lucide-react'
import Link from 'next/link'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showAppointmentDetail, setShowAppointmentDetail] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'calendar'

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      const response = await fetch('/api/appointments/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAppointments(data.appointments || [])
      } else {
        // Console error removed for production
      }
    } catch (error) {
      // Console error removed for production
    } finally {
      setIsLoading(false)
    }
  }

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = searchTerm === '' || 
                          appointment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          appointment.customer_phone?.includes(searchTerm) ||
                          appointment.service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          appointment.address?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'text-blue-400 bg-blue-500/20'
      case 'confirmed': return 'text-green-400 bg-green-500/20'
      case 'completed': return 'text-purple-400 bg-purple-500/20'
      case 'cancelled': return 'text-red-400 bg-red-500/20'
      case 'rescheduled': return 'text-orange-400 bg-orange-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <Calendar className="w-4 h-4" />
      case 'confirmed': return <CheckCircle className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'cancelled': return <XCircle className="w-4 h-4" />
      case 'rescheduled': return <AlertTriangle className="w-4 h-4" />
      default: return <Calendar className="w-4 h-4" />
    }
  }

  const openAppointmentDetail = (appointment) => {
    setSelectedAppointment(appointment)
    setShowAppointmentDetail(true)
  }

  const closeAppointmentDetail = () => {
    setShowAppointmentDetail(false)
    setSelectedAppointment(null)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate appointment statistics
  const totalAppointments = appointments.length
  const upcomingAppointments = appointments.filter(apt => 
    new Date(apt.scheduled_date) > new Date() && apt.status !== 'cancelled'
  ).length
  const completedAppointments = appointments.filter(apt => apt.status === 'completed').length
  const totalRevenue = appointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + (apt.estimated_value || 0), 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Loading Appointments</h2>
          <p className="text-gray-400">Fetching your appointment schedule...</p>
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
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">Appointments</h1>
            </Link>
            <div className="flex items-center gap-3">
              <motion.button
                onClick={fetchAppointments}
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.3 }}
                className="p-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
                title="Refresh Appointments"
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Appointment
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Appointment Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Total Appointments</h3>
            </div>
            <p className="text-3xl font-bold text-white">{totalAppointments}</p>
            <p className="text-gray-400 text-sm">All time</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Upcoming</h3>
            </div>
            <p className="text-3xl font-bold text-white">{upcomingAppointments}</p>
            <p className="text-gray-400 text-sm">Scheduled</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Completed</h3>
            </div>
            <p className="text-3xl font-bold text-white">{completedAppointments}</p>
            <p className="text-gray-400 text-sm">Finished</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 p-6">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Total Revenue</h3>
            </div>
            <p className="text-3xl font-bold text-white">${totalRevenue.toLocaleString()}</p>
            <p className="text-gray-400 text-sm">From appointments</p>
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
                placeholder="Search appointments by customer, service, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div className="flex gap-3">
              {['all', 'scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                    filterStatus === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Appointments List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-700/50 overflow-hidden"
        >
          {filteredAppointments.length > 0 ? (
            <div className="divide-y divide-gray-700/50">
              {filteredAppointments.map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-700/30 transition-colors cursor-pointer"
                  onClick={() => openAppointmentDetail(appointment)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        appointment.status === 'completed' ? 'bg-green-500/20 border border-green-500/30' :
                        appointment.status === 'confirmed' ? 'bg-blue-500/20 border border-blue-500/30' :
                        appointment.status === 'cancelled' ? 'bg-red-500/20 border border-red-500/30' :
                        appointment.status === 'rescheduled' ? 'bg-orange-500/20 border border-orange-500/30' :
                        'bg-purple-500/20 border border-purple-500/30'
                      }`}>
                        {getStatusIcon(appointment.status)}
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {appointment.customer_name || 'Unknown Customer'}
                        </h3>
                        <p className="text-gray-400">
                          {appointment.service || 'General Service'}
                        </p>
                        <div className="flex items-center gap-4 text-gray-500 text-sm mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(appointment.scheduled_date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(appointment.scheduled_date)}
                          </div>
                          {appointment.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {appointment.address.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-white font-semibold">
                        ${appointment.estimated_value || 0}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {appointment.customer_phone}
                      </p>
                    </div>
                  </div>
                  
                  {appointment.notes && (
                    <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {appointment.notes.substring(0, 150)}...
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No Appointments Found</h3>
              <p className="text-gray-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No appointments match your current filters.' 
                  : 'No appointments have been scheduled yet.'}
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Appointment Detail Modal */}
      <AnimatePresence>
        {showAppointmentDetail && selectedAppointment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeAppointmentDetail}
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
                  <h2 className="text-2xl font-bold text-white">Appointment Details</h2>
                  <button
                    onClick={closeAppointmentDetail}
                    className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Appointment Information */}
                  <div className="space-y-6">
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Appointment Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Customer:</span>
                          <span className="text-white">{selectedAppointment.customer_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Phone:</span>
                          <span className="text-white">{selectedAppointment.customer_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Service:</span>
                          <span className="text-white">{selectedAppointment.service}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date:</span>
                          <span className="text-white">{formatDate(selectedAppointment.scheduled_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Time:</span>
                          <span className="text-white">{formatTime(selectedAppointment.scheduled_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(selectedAppointment.status)}`}>
                            {getStatusIcon(selectedAppointment.status)}
                            {selectedAppointment.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Estimated Value:</span>
                          <span className="text-white font-semibold">
                            ${selectedAppointment.estimated_value || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedAppointment.address && (
                      <div className="bg-gray-700/30 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Location</h3>
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-blue-400 mt-1" />
                          <p className="text-gray-300">{selectedAppointment.address}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes and Actions */}
                  <div className="space-y-6">
                    {selectedAppointment.notes && (
                      <div className="bg-gray-700/30 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-gray-300 whitespace-pre-wrap">{selectedAppointment.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
                      <div className="space-y-3">
                        <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2">
                          <Edit className="w-4 h-4" />
                          Edit Appointment
                        </button>
                        <button className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
                          <Phone className="w-4 h-4" />
                          Call Customer
                        </button>
                        <button className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Send SMS
                        </button>
                        <button className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Cancel Appointment
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
