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
  duration: number
  status: string
}

interface Slot {
  time: string
  appointments: Appointment[]
}

interface DayData {
  date: string
  slots: Slot[]
}

interface WeekViewProps {
  currentDate: Date
  onAppointmentClick: (appointment: Appointment) => void
  onEmptySlotClick: (date: Date, time: string) => void
}

export function WeekView({ currentDate, onAppointmentClick, onEmptySlotClick }: WeekViewProps) {
  const { theme, business, getServiceColor } = useBusinessData()
  const [days, setDays] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  useEffect(() => {
    loadWeekData()
  }, [currentDate])

  const loadWeekData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculate start and end of week (Sunday to Saturday)
      const startOfWeek = new Date(currentDate)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day
      startOfWeek.setDate(diff)
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const startDateStr = startOfWeek.toISOString().split('T')[0]
      const endDateStr = endOfWeek.toISOString().split('T')[0]

      const response = await fetchWithAuth(
        `/api/dashboard/calendar?view=week&startDate=${startDateStr}&endDate=${endDateStr}`
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

  // Generate time slots (8am to 8pm, 30-minute intervals)
  const generateTimeSlots = () => {
    const slots: string[] = []
    for (let hour = 8; hour < 20; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`)
      slots.push(`${String(hour).padStart(2, '0')}:30`)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Generate week days
  const generateWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push(date)
    }
    return days
  }

  const weekDays = generateWeekDays()
  const today = new Date()

  const getAppointmentPosition = (appointment: Appointment, dayDate: Date) => {
    const startTime = new Date(appointment.start_time)
    const endTime = new Date(appointment.end_time)
    
    // Check if appointment is on this day
    const appointmentDate = new Date(startTime)
    appointmentDate.setHours(0, 0, 0, 0)
    const dayDateOnly = new Date(dayDate)
    dayDateOnly.setHours(0, 0, 0, 0)
    
    if (appointmentDate.getTime() !== dayDateOnly.getTime()) {
      return null
    }

    // Calculate position (minutes from 8am)
    const startHour = startTime.getHours()
    const startMin = startTime.getMinutes()
    const startMinutes = (startHour - 8) * 60 + startMin
    
    // Calculate height (duration in minutes)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.max(30, Math.round(durationMs / (1000 * 60)))
    
    return {
      top: (startMinutes / 30) * 30, // Each 30-min slot is 30px
      height: (durationMinutes / 30) * 30
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
  }

  if (loading) {
    return (
      <div className="flex">
        <div className="w-[120px] space-y-2">
          {timeSlots.map((_, i) => (
            <LoadingSkeleton key={i} width="100%" height={30} />
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 * timeSlots.length }).map((_, i) => (
            <LoadingSkeleton key={i} width="100%" height={30} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadWeekData} size="sm">
          Retry
        </Button>
      </div>
    )
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const isTodayDate = (date: Date) => {
    const todayOnly = new Date(today)
    todayOnly.setHours(0, 0, 0, 0)
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    return todayOnly.getTime() === dateOnly.getTime()
  }

  return (
    <div className="flex overflow-x-auto">
      {/* Time column */}
      <div className="w-[120px] flex-shrink-0">
        <div className="h-8" /> {/* Header spacer */}
        <div className="space-y-0">
          {timeSlots.map((time, idx) => {
            const [hours] = time.split(':').map(Number)
            const showHour = idx % 2 === 0
            return (
              <div
                key={time}
                className="h-[30px] text-xs text-slate-400 pr-2 text-right"
                aria-label={`Time slot ${time}`}
              >
                {showHour && formatTime(time)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Days columns */}
      <div className="flex-1 grid grid-cols-7 gap-1 min-w-0">
        {/* Day headers */}
        {weekDays.map((day, dayIdx) => {
          const dayData = days.find(d => {
            const dayDateStr = day.toISOString().split('T')[0]
            return d.date === dayDateStr
          })
          const isToday = isTodayDate(day)
          
          return (
            <motion.div
              key={dayIdx}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIdx * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-center py-2 border-b border-slate-700"
              style={{
                backgroundColor: isToday ? `${primaryColor}20` : undefined
              }}
            >
              <div className="text-xs text-slate-400">{dayNames[dayIdx]}</div>
              <div className={`text-sm font-medium ${isToday ? 'text-white' : 'text-slate-300'}`}>
                {day.getDate()}
              </div>
            </motion.div>
          )
        })}

        {/* Time slots grid */}
        {timeSlots.map((time, timeIdx) => {
          return (
            <React.Fragment key={time}>
              {weekDays.map((day, dayIdx) => {
                const dayData = days.find(d => {
                  const dayDateStr = day.toISOString().split('T')[0]
                  return d.date === dayDateStr
                })
                
                const slot = dayData?.slots.find(s => s.time === time)
                const appointments = slot?.appointments || []
                
                // Check for current time indicator
                const isToday = isTodayDate(day)
                const [hours, minutes] = time.split(':').map(Number)
                const now = new Date()
                const showCurrentTime = isToday && 
                  now.getHours() === hours && 
                  Math.abs(now.getMinutes() - minutes) < 30

                return (
                  <div
                    key={`${dayIdx}-${timeIdx}`}
                    className="h-[30px] border-b border-r border-slate-700/50 relative group"
                    onClick={() => {
                      if (appointments.length === 0) {
                        const slotDate = new Date(day)
                        slotDate.setHours(hours, minutes, 0, 0)
                        onEmptySlotClick(slotDate, time)
                      }
                    }}
                    aria-label={`${day.toLocaleDateString()} at ${time}`}
                  >
                    {showCurrentTime && (
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
                        style={{ top: `${(now.getMinutes() / 30) * 100}%` }}
                        aria-label="Current time"
                      />
                    )}
                    
                    {/* Appointment blocks */}
                    {appointments.map((apt) => {
                      const position = getAppointmentPosition(apt, day)
                      if (!position) return null
                      
                      const color = getServiceColor(apt.service_type)
                      const startTime = new Date(apt.start_time)
                      const endTime = new Date(apt.end_time)
                      
                      return (
                        <motion.div
                          key={apt.id}
                          initial={{ opacity: 0, scale: 0.8, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ 
                            delay: (dayIdx + timeIdx) * 0.01,
                            type: 'spring',
                            stiffness: 300,
                            damping: 25
                          }}
                          className="absolute left-1 right-1 rounded px-2 py-1 text-xs cursor-pointer z-20"
                          style={{
                            top: `${position.top}px`,
                            height: `${Math.max(30, position.height)}px`,
                            backgroundColor: color,
                            color: 'white',
                            boxShadow: `0 2px 8px ${color}40`
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAppointmentClick(apt)
                          }}
                          whileHover={{ scale: 1.05, y: -2, zIndex: 30 }}
                          whileTap={{ scale: 0.95 }}
                          aria-label={`${apt.customer_name} - ${apt.service_type} from ${formatTime(time)}`}
                        >
                          <div className="font-medium truncate">{apt.customer_name}</div>
                          <div className="text-xs opacity-90 truncate">
                            {formatTime(startTime.toTimeString().slice(0, 5))} - {formatTime(endTime.toTimeString().slice(0, 5))}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )
              })}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

