'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { AlertCircle } from 'lucide-react'

interface Appointment {
  id: string
  customer_name: string
  service_type: string
  start_time: string
  end_time: string
  status: string
}

interface DayDetailsSidebarProps {
  open: boolean
  onClose: () => void
  selectedDate: Date | null
  onAppointmentClick: (appointment: Appointment) => void
  onCreateAppointment: () => void
}

export function DayDetailsSidebar({
  open,
  onClose,
  selectedDate,
  onAppointmentClick,
  onCreateAppointment
}: DayDetailsSidebarProps) {
  const { theme, business, getServiceColor, formatTime } = useBusinessData()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  useEffect(() => {
    if (open && selectedDate) {
      loadDayAppointments()
    } else {
      setAppointments([])
      setError(null)
    }
  }, [open, selectedDate])

  const loadDayAppointments = async () => {
    if (!selectedDate) return

    try {
      setLoading(true)
      setError(null)

      const dateStr = selectedDate.toISOString().split('T')[0]

      const response = await fetchWithAuth(
        `/api/dashboard/week-calendar?startDate=${dateStr}&endDate=${dateStr}`
      )

      if (!response.ok) {
        throw new Error(`Failed to load appointments (${response.status})`)
      }

      const data = await response.json()
      if (data.success && data.days && data.days.length > 0) {
        const dayData = data.days.find((d: any) => d.date === dateStr)
        setAppointments(dayData?.appointments || [])
      } else {
        setAppointments([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments')
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const formatDateHeader = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
      completed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
      no_show: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    }

    return statusColors[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  // Handle click outside
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-sidebar]')) return
      onClose()
    }

    // Small delay to prevent immediate close on open
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && selectedDate && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.div
            data-sidebar
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200, duration: 0.4 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-slate-900 border-l border-slate-700/50 z-50 flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-details-title"
            aria-describedby="day-details-description"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 id="day-details-title" className="text-xl font-bold text-white">
                  {formatDateHeader(selectedDate)}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CalendarIcon className="w-4 h-4" />
                <span id="day-details-description">
                  {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <LoadingSkeleton key={i} width="100%" height={80} />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <p className="text-red-400 mb-4 text-center">{error}</p>
                  <Button onClick={loadDayAppointments} size="sm">
                    Retry
                  </Button>
                </div>
              ) : appointments.length === 0 ? (
                <EmptyState
                  icon={CalendarIcon}
                  title="No appointments"
                  description="No appointments scheduled for this day"
                  action={
                    <Button 
                      onClick={onCreateAppointment} 
                      style={{ backgroundColor: primaryColor }}
                      aria-label="Create new appointment"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Appointment
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt, idx) => {
                    const color = getServiceColor(apt.service_type)
                    const startTime = new Date(apt.start_time)
                    const endTime = new Date(apt.end_time)

                    return (
                      <motion.button
                        key={apt.id}
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ 
                          delay: idx * 0.05,
                          duration: 0.3,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        onClick={() => onAppointmentClick(apt)}
                        className="w-full text-left bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 transition-all"
                        style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        aria-label={`${apt.customer_name} - ${apt.service_type} at ${formatTime(startTime.toTimeString().slice(0, 5))}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Time */}
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-sm font-medium text-slate-300">
                                {formatTime(startTime.toTimeString().slice(0, 5))} - {formatTime(endTime.toTimeString().slice(0, 5))}
                              </span>
                            </div>

                            {/* Customer & Service */}
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base font-semibold text-white truncate">
                                {apt.customer_name}
                              </h3>
                              <span
                                className="px-2 py-1 rounded text-xs font-medium text-white flex-shrink-0"
                                style={{ backgroundColor: color }}
                              >
                                {apt.service_type}
                              </span>
                            </div>

                            {/* Status */}
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(apt.status)}`}
                            >
                              {apt.status}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <Button
                onClick={onCreateAppointment}
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                aria-label="Create new appointment for this day"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Appointment
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

