'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { AlertCircle, Search, Calendar as CalendarIcon } from 'lucide-react'

interface Appointment {
  id: string
  scheduled_date: string
  start_time: string
  end_time: string
  customer_name: string
  service_type: string
  status: string
  estimated_value: number | null
  address: string | null
  notes: string | null
}

interface AgendaViewProps {
  currentDate: Date
  onAppointmentClick: (appointment: Appointment) => void
  onCreateAppointment: () => void
}

export function AgendaView({ currentDate, onAppointmentClick, onCreateAppointment }: AgendaViewProps) {
  const { theme, business, getServiceColor, formatDate, formatTime } = useBusinessData()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    loadAgendaData()
  }, [currentDate])

  const loadAgendaData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load 30 days of data
      const startDate = new Date(currentDate)
      startDate.setDate(startDate.getDate() - 7) // 7 days before
      const endDate = new Date(currentDate)
      endDate.setDate(endDate.getDate() + 23) // 23 days after (30 total)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const response = await fetchWithAuth(
        `/api/dashboard/calendar?view=agenda&startDate=${startDateStr}&endDate=${endDateStr}`
      )

      if (!response.ok) {
        throw new Error(`Failed to load calendar data (${response.status})`)
      }

      const data = await response.json()
      if (data.success && data.appointments) {
        setAppointments(data.appointments)
      } else {
        setAppointments([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  // Filter and group appointments
  const filteredAndGrouped = useMemo(() => {
    if (!appointments || appointments.length === 0) return []
    let filtered = appointments

    // Apply search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase()
      filtered = appointments.filter(apt => 
        apt.customer_name.toLowerCase().includes(query) ||
        apt.service_type.toLowerCase().includes(query) ||
        (apt.address && apt.address.toLowerCase().includes(query))
      )
    }

    // Group by date
    const grouped = new Map<string, Appointment[]>()
    if (filtered && filtered.length > 0) {
      filtered.forEach(apt => {
        const dateStr = apt.scheduled_date
        if (!grouped.has(dateStr)) {
          grouped.set(dateStr, [])
        }
        grouped.get(dateStr)!.push(apt)
      })

      // Sort dates
      const sortedDates = Array.from(grouped.keys()).sort()

      // Sort appointments within each date by time
      if (sortedDates && sortedDates.length > 0) {
        sortedDates.forEach(dateStr => {
          const apts = grouped.get(dateStr)!
          if (apts && apts.length > 0) {
            apts.sort((a, b) => {
              const timeA = new Date(a.start_time).getTime()
              const timeB = new Date(b.start_time).getTime()
              return timeA - timeB
            })
          }
        })

        return sortedDates.map(dateStr => ({
          date: dateStr,
          appointments: grouped.get(dateStr) || []
        }))
      }
    }
    
    return []
  }, [appointments, debouncedSearch])

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr)
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

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton width="100%" height={40} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <LoadingSkeleton width="200px" height={24} />
            <LoadingSkeleton width="100%" height={80} />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadAgendaData} size="sm">
          Retry
        </Button>
      </div>
    )
  }

  if (filteredAndGrouped.length === 0) {
    return (
      <EmptyState
        icon={CalendarIcon}
        title={debouncedSearch ? "No appointments found" : "No appointments"}
        message={
          debouncedSearch
            ? "Try adjusting your search terms"
            : "Get started by creating your first appointment"
        }
        actionLabel={debouncedSearch ? "Clear Search" : "Create Appointment"}
        onAction={debouncedSearch ? () => setSearchQuery('') : onCreateAppointment}
        iconColor={primaryColor}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by customer, service, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          aria-label="Search appointments"
        />
      </div>

      {/* Appointments list */}
      <div className="space-y-6 max-h-[600px] overflow-y-auto">
        {filteredAndGrouped.map(({ date, appointments: dateAppointments }) => (
          <div key={date} className="space-y-3">
            {/* Date header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="sticky top-0 z-10 py-2 px-4 rounded-lg"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <h3 className="text-sm font-semibold text-white">
                {formatDateHeader(date)}
              </h3>
              <p className="text-xs text-slate-400">
                {dateAppointments.length} {dateAppointments.length === 1 ? 'appointment' : 'appointments'}
              </p>
            </motion.div>

            {/* Appointment cards */}
            {dateAppointments.map((apt, aptIdx) => {
              const color = getServiceColor(apt.service_type)
              const startTime = new Date(apt.start_time)
              const endTime = new Date(apt.end_time)

              return (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: aptIdx * 0.05,
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 cursor-pointer transition-all"
                  style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
                  onClick={() => onAppointmentClick(apt)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label={`${apt.customer_name} - ${apt.service_type} on ${formatDateHeader(date)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Time */}
                      <div className="text-sm font-medium text-slate-300 mb-2">
                        {formatTime(startTime.toTimeString().slice(0, 5))} - {formatTime(endTime.toTimeString().slice(0, 5))}
                      </div>

                      {/* Customer & Service */}
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-semibold text-white truncate">
                          {apt.customer_name}
                        </h4>
                        <span
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: color }}
                        >
                          {apt.service_type}
                        </span>
                      </div>

                      {/* Address */}
                      {apt.address && (
                        <p className="text-sm text-slate-400 mb-2 truncate">
                          {apt.address}
                        </p>
                      )}

                      {/* Notes preview */}
                      {apt.notes && (
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {apt.notes}
                        </p>
                      )}
                    </div>

                    {/* Status & Value */}
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(apt.status)}`}
                      >
                        {apt.status}
                      </span>
                      {apt.estimated_value && (
                        <span className="text-sm font-semibold text-green-400">
                          ${apt.estimated_value.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

