'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
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

interface DayViewProps {
  currentDate: Date
  onAppointmentClick: (appointment: Appointment) => void
  onEmptySlotClick: (date: Date, time: string) => void
}

export function DayView({ currentDate, onAppointmentClick, onEmptySlotClick }: DayViewProps) {
  const { theme, business, getServiceColor } = useBusinessData()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  useEffect(() => {
    loadDayData()
  }, [currentDate])

  useEffect(() => {
    // Auto-scroll to current time on load
    if (!loading && scrollContainerRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMin = now.getMinutes()
      
      // Only scroll if viewing today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const viewDate = new Date(currentDate)
      viewDate.setHours(0, 0, 0, 0)
      
      if (today.getTime() === viewDate.getTime() && currentHour >= 8 && currentHour < 20) {
        const scrollPosition = ((currentHour - 8) * 60 + currentMin) * 1 // 1px per minute
        scrollContainerRef.current.scrollTop = scrollPosition - 100 // Offset for visibility
      }
    }
  }, [loading, currentDate])

  const loadDayData = async () => {
    try {
      setLoading(true)
      setError(null)

      const dateStr = currentDate.toISOString().split('T')[0]

      const response = await fetchWithAuth(
        `/api/dashboard/calendar?view=day&startDate=${dateStr}&endDate=${dateStr}`
      )

      if (!response.ok) {
        throw new Error(`Failed to load calendar data (${response.status})`)
      }

      const data = await response.json()
      if (data.success && data.slots) {
        setSlots(data.slots)
      } else {
        setSlots([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  // Generate time slots (8am to 8pm, hourly)
  const generateTimeSlots = () => {
    const slots: string[] = []
    for (let hour = 8; hour < 20; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()
  const today = new Date()
  const isToday = (() => {
    const todayOnly = new Date(today)
    todayOnly.setHours(0, 0, 0, 0)
    const dateOnly = new Date(currentDate)
    dateOnly.setHours(0, 0, 0, 0)
    return todayOnly.getTime() === dateOnly.getTime()
  })()

  const getAppointmentPosition = (appointment: Appointment) => {
    const startTime = new Date(appointment.start_time)
    const endTime = new Date(appointment.end_time)
    
    // Calculate position (minutes from 8am)
    const startHour = startTime.getHours()
    const startMin = startTime.getMinutes()
    const startMinutes = (startHour - 8) * 60 + startMin
    
    // Calculate height (duration in minutes)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.max(60, Math.round(durationMs / (1000 * 60)))
    
    return {
      top: startMinutes, // 1px per minute
      height: durationMinutes
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
  }

  const getAppointmentsForHour = (hour: number) => {
    return slots.flatMap(slot => {
      const [slotHour] = slot.time.split(':').map(Number)
      if (slotHour === hour) {
        return slot.appointments
      }
      // Also check appointments that span across hours
      return slot.appointments.filter(apt => {
        const startTime = new Date(apt.start_time)
        return startTime.getHours() === hour || 
               (startTime.getHours() < hour && new Date(apt.end_time).getHours() > hour)
      })
    })
  }

  if (loading) {
    return (
      <div className="flex">
        <div className="w-[80px] space-y-2">
          {timeSlots.map((_, i) => (
            <LoadingSkeleton key={i} width="100%" height={60} />
          ))}
        </div>
        <div className="flex-1">
          {timeSlots.map((_, i) => (
            <LoadingSkeleton key={i} width="100%" height={60} />
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
        <Button onClick={loadDayData} size="sm">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden">
      {/* Time labels */}
      <div className="w-[80px] flex-shrink-0">
        <div className="h-12" /> {/* Header spacer */}
        <div className="space-y-0">
          {timeSlots.map((time) => {
            const [hours] = time.split(':').map(Number)
            return (
              <div
                key={time}
                className="h-[60px] text-sm text-slate-400 pr-2 text-right flex items-start pt-1"
                aria-label={`Time ${time}`}
              >
                {formatTime(time)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Day content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 relative overflow-y-auto max-h-[600px]"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Day header */}
        <div 
          className="sticky top-0 z-20 px-4 py-3 border-b border-slate-700 bg-slate-900"
          style={{
            backgroundColor: isToday ? `${primaryColor}20` : undefined
          }}
        >
          <div className="text-lg font-semibold text-white">
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="relative" style={{ height: '720px' }}> {/* 12 hours × 60px */}
          {timeSlots.map((time, idx) => {
            const [hours] = time.split(':').map(Number)
            const appointments = getAppointmentsForHour(hours)
            
            // Check for current time indicator
            const now = new Date()
            const showCurrentTime = isToday && 
              now.getHours() === hours && 
              now.getMinutes() < 60

            return (
              <div
                key={time}
                className="absolute left-0 right-0 border-b border-slate-700/50"
                style={{
                  top: `${idx * 60}px`,
                  height: '60px'
                }}
                onClick={() => {
                  if (appointments.length === 0) {
                    const slotDate = new Date(currentDate)
                    slotDate.setHours(hours, 0, 0, 0)
                    onEmptySlotClick(slotDate, time)
                  }
                }}
                aria-label={`${currentDate.toLocaleDateString()} at ${time}`}
              >
                {showCurrentTime && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
                    style={{ top: `${(now.getMinutes() / 60) * 100}%` }}
                    aria-label="Current time"
                  />
                )}
                
                {/* Appointment blocks */}
                {appointments.map((apt) => {
                  const position = getAppointmentPosition(apt)
                  if (!position) return null
                  
                  const color = getServiceColor(apt.service_type)
                  const startTime = new Date(apt.start_time)
                  const endTime = new Date(apt.end_time)
                  
                  // Check if this appointment starts in this hour slot
                  if (startTime.getHours() !== hours) return null
                  
                  return (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, scale: 0.8, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      transition={{ 
                        delay: idx * 0.05,
                        type: 'spring',
                        stiffness: 300,
                        damping: 25
                      }}
                      className="absolute left-2 right-2 rounded-lg px-3 py-2 cursor-pointer z-20 shadow-lg"
                      style={{
                        top: `${position.top - (idx * 60)}px`,
                        height: `${Math.max(60, position.height)}px`,
                        backgroundColor: color,
                        color: 'white',
                        boxShadow: `0 4px 12px ${color}40`
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick(apt)
                      }}
                      whileHover={{ scale: 1.03, y: -2, zIndex: 30 }}
                      whileTap={{ scale: 0.97 }}
                      aria-label={`${apt.customer_name} - ${apt.service_type} from ${formatTime(startTime.toTimeString().slice(0, 5))}`}
                    >
                      <div className="font-semibold truncate">{apt.customer_name}</div>
                      <div className="text-sm opacity-90 truncate">{apt.service_type}</div>
                      <div className="text-xs opacity-80 mt-1">
                        {formatTime(startTime.toTimeString().slice(0, 5))} - {formatTime(endTime.toTimeString().slice(0, 5))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

