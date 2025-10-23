'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, Clock, User, MapPin, DollarSign, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react'
import Link from 'next/link'

interface Appointment {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_type: string
  scheduled_date: string
  duration: number
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  estimated_value?: number
  actual_value?: number
  notes?: string
  address?: string
  google_calendar_event_id?: string
  reminder_sent: boolean
  confirmation_sent: boolean
  created_at: string
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('upcoming')

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to view appointments')
        return
      }

      const response = await fetch('/api/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAppointments(data.appointments || [])
      } else {
        setError('Failed to load appointments')
      }
    } catch (err) {
      setError('Network error loading appointments')
    } finally {
      setLoading(false)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const handleEditAppointment = (appointmentId: string) => {
    // TODO: Implement edit appointment functionality
    console.log('Edit appointment:', appointmentId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-5 h-5 text-blue-400" />
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'no_show':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'no_show':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const filteredAppointments = appointments.filter(appointment => {
    const now = new Date()
    const appointmentDate = new Date(appointment.scheduled_date)
    
    switch (filter) {
      case 'upcoming':
        return appointmentDate >= now && appointment.status !== 'cancelled' && appointment.status !== 'completed'
      case 'completed':
        return appointment.status === 'completed'
      case 'cancelled':
        return appointment.status === 'cancelled' || appointment.status === 'no_show'
      default:
        return true
    }
  })

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
          <p className="text-white text-lg">Loading appointments...</p>
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
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Appointments</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={loadAppointments}
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
                <h1 className="text-3xl font-bold text-white">Appointments</h1>
                <p className="text-gray-400 text-sm">Schedule & Manage Customer Appointments</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                <Plus className="w-5 h-5" />
                <span>New Appointment</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex space-x-2 bg-gray-800/50 rounded-xl p-2">
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {filteredAppointments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-blue-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">No Appointments</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              {filter === 'upcoming' 
                ? 'No upcoming appointments scheduled. Your AI receptionist can book appointments when customers call.'
                : `No ${filter} appointments found.`
              }
            </p>
            <button className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              Create New Appointment
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {filteredAppointments.map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <Calendar className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {appointment.customer_name}
                      </h3>
                      <p className="text-gray-400">{appointment.service_type}</p>
                      <p className="text-gray-500 text-sm">
                        {formatPhoneNumber(appointment.customer_phone)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(appointment.status)}`}>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(appointment.status)}
                        <span className="capitalize">{appointment.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(appointment.scheduled_date).toLocaleDateString()} at{' '}
                      {new Date(appointment.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{appointment.duration} minutes</span>
                  </div>
                  
                  {appointment.estimated_value && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">${appointment.estimated_value}</span>
                    </div>
                  )}
                </div>

                {appointment.address && (
                  <div className="flex items-center space-x-2 text-gray-300 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{appointment.address}</span>
                  </div>
                )}

                {appointment.notes && (
                  <div className="bg-gray-800/30 rounded-xl p-4 mb-4">
                    <p className="text-gray-300 text-sm">{appointment.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Created {new Date(appointment.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-4">
                    {appointment.confirmation_sent && (
                      <span className="text-green-400 font-medium">Confirmed</span>
                    )}
                    {appointment.reminder_sent && (
                      <span className="text-blue-400 font-medium">Reminder sent</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  )
}
