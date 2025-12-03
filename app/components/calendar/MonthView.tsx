'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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

interface DayData {
  date: string
  appointments: Appointment[]
}

interface MonthViewProps {
  currentDate: Date
  onDayClick: (date: Date) => void
  selectedDate: Date | null
  onDateChange?: (date: Date) => void
}

export function MonthView({ currentDate, onDayClick, selectedDate, onDateChange }: MonthViewProps) {
  const { theme, business, getServiceColor } = useBusinessData()
  const [days, setDays] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  useEffect(() => {
    loadMonthData()
  }, [currentDate])

  const loadMonthData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculate start and end of month
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const response = await fetchWithAuth(
        `/api/dashboard/calendar?view=month&startDate=${startDateStr}&endDate=${endDateStr}`
      )

      if (!response.ok) {
        throw new Error(`Failed to load calendar data (${response.status})`)
      }

      const data = await response.json()
      if (data.success && data.days) {
        setDays(data.days)
      } else {
        setDays([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
      setDays([])
    } finally {
      setLoading(false)
    }
  }

  // Generate calendar grid
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // First day of month
    const firstDay = new Date(year, month, 1)
    const firstDayOfWeek = firstDay.getDay() // 0 = Sunday, 6 = Saturday
    
    // Last day of month
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    // Create array of all days to display (including empty cells)
    const daysArray: Array<{ date: Date | null; appointments: Appointment[] }> = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      daysArray.push({ date: null, appointments: [] })
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const dayData = days.find(d => d.date === dateStr)
      daysArray.push({
        date,
        appointments: dayData?.appointments || []
      })
    }
    
    // Fill remaining cells to make 42 total (6 rows × 7 columns)
    while (daysArray.length < 42) {
      daysArray.push({ date: null, appointments: [] })
    }
    
    return daysArray
  }

  const calendarDays = generateCalendarDays()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isToday = (date: Date | null) => {
    if (!date) return false
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    return dateOnly.getTime() === today.getTime()
  }

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    const selectedOnly = new Date(selectedDate)
    selectedOnly.setHours(0, 0, 0, 0)
    return dateOnly.getTime() === selectedOnly.getTime()
  }

  const getAppointmentDots = (appointments: Appointment[]) => {
    if (!appointments || appointments.length === 0) return null
    
    const maxDots = 3
    const displayAppointments = appointments.slice(0, maxDots)
    const remaining = appointments.length - maxDots
    
    return (
      <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
        {displayAppointments && displayAppointments.length > 0 ? displayAppointments.map((apt, idx) => {
          const color = getServiceColor(apt.service_type)
          return (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300 }}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: color }}
              aria-label={`${apt.customer_name} - ${apt.service_type}`}
            />
          )
        }) : null}
        {remaining > 0 && (
          <motion.span 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: displayAppointments.length * 0.05, type: 'spring', stiffness: 300 }}
            className="text-xs text-slate-400" 
            aria-label={`${remaining} more appointments`}
          >
            +{remaining}
          </motion.span>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <LoadingSkeleton key={i} width="100%" height={60} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadMonthData} size="sm">
          Retry
        </Button>
      </div>
    )
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-2">
      {/* Day headers */}
      <motion.div 
        className="grid grid-cols-7 gap-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {dayNames.map((day, idx) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02, duration: 0.2 }}
            className="text-xs font-medium text-slate-400 text-center py-2"
            aria-label={day}
          >
            {day}
          </motion.div>
        ))}
      </motion.div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays && calendarDays.length > 0 ? calendarDays.map((dayData, index) => {
          const { date, appointments } = dayData
          const dayIsToday = isToday(date)
          const dayIsSelected = isSelected(date)
          const isPast = date && date < today && !dayIsToday
          const isCurrentMonth = date && date.getMonth() === currentDate.getMonth()

          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                className="h-[60px] rounded-lg bg-slate-900/30 opacity-30"
                aria-hidden="true"
              />
            )
          }

          return (
            <motion.button
              key={date.toISOString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: index * 0.01, 
                duration: 0.2,
                ease: [0.16, 1, 0.3, 1]
              }}
              onClick={() => {
                onDayClick(date)
                if (onDateChange) {
                  onDateChange(date)
                }
              }}
              disabled={isPast}
              className={`
                h-[60px] rounded-lg p-2 text-left transition-all
                ${dayIsToday ? 'ring-2' : ''}
                ${dayIsSelected ? 'bg-opacity-20' : 'bg-slate-800/30'}
                ${isPast ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700/50 cursor-pointer'}
                ${!isCurrentMonth ? 'opacity-30' : ''}
              `}
              style={{
                borderColor: dayIsToday ? primaryColor : 'transparent',
                ringColor: dayIsToday ? `${primaryColor}50` : 'transparent',
                backgroundColor: dayIsSelected ? `${primaryColor}20` : undefined,
                boxShadow: dayIsToday ? `0 2px 8px ${primaryColor}30` : '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
              aria-label={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${appointments.length > 0 ? `, ${appointments.length} appointments` : ''}`}
              aria-selected={dayIsSelected}
              whileHover={!isPast ? { scale: 1.05, y: -2 } : {}}
              whileTap={!isPast ? { scale: 0.95 } : {}}
            >
              <div className="text-sm font-medium text-white">
                {date.getDate()}
              </div>
              {getAppointmentDots(appointments)}
            </motion.button>
          )
        }) : (
          <div className="col-span-7 text-center py-8">
            <p className="text-slate-400 text-sm">No calendar data available</p>
          </div>
        )}
      </div>
    </div>
  )
}

