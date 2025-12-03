'use client'

import React, { useState, useEffect, memo, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { LoadingSkeleton } from './ui/LoadingSkeleton'
import { EmptyState } from './ui/EmptyState'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/monitoring'

interface DayData {
  date: string
  dayName: string
  dayNumber: number
  isToday: boolean
  appointments: Array<{
    id: string
    time: string
    customer: string
    serviceType: string
  }>
  count: number
}

interface WeekCalendarWidgetProps {
  onDayClick?: (date: string) => void
  onFullCalendarClick?: () => void
}

export const WeekCalendarWidget = memo(function WeekCalendarWidget({
  onDayClick,
  onFullCalendarClick
}: WeekCalendarWidgetProps) {
  const { business, theme, loading: businessLoading, getServiceColor } = useBusinessData()
  const [days, setDays] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessLoading) {
      loadWeekCalendar()
    }
  }, [businessLoading])

  const loadWeekCalendar = async () => {
    try {
      setLoading(true)
      setError(null)

      // Calculate week start (Sunday)
      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - start.getDay())
      start.setHours(0, 0, 0, 0)

      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)

      const response = await fetchWithAuth(
        `/api/dashboard/week-calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch week calendar')
      }

      const result = await response.json()
      if (result.success && result.days) {
        setDays(result.days)
      } else {
        throw new Error('Invalid response')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      logger.error('Failed to load week calendar', { error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDayClick = useCallback((date: string) => {
    if (onDayClick) {
      onDayClick(date)
    }
  }, [onDayClick])

  const handleFullCalendarClick = useCallback(() => {
    if (onFullCalendarClick) {
      onFullCalendarClick()
    }
  }, [onFullCalendarClick])

  if (businessLoading || loading) {
    return (
      <div className="h-[120px] p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg">
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <LoadingSkeleton key={i} width={45} height={45} variant="rectangle" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !theme) {
    return (
      <div className="h-[120px] p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl flex items-center justify-center shadow-lg">
        <p className="text-slate-400 text-sm">Failed to load calendar</p>
      </div>
    )
  }

  const primaryColor = theme.primaryColor

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="h-[120px] p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 shadow-lg hover:shadow-xl hover:border-white/20 transition-all"
      style={{
        borderColor: `${primaryColor}30`,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">This Week</h3>
        <motion.button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleFullCalendarClick()
          }}
          whileHover={{ scale: 1.1, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open full calendar"
        >
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </motion.button>
      </div>

      {/* Days Row */}
      <div className="flex gap-2">
        {days && days.length > 0 ? days.map((day, index) => {
          const isToday = day.isToday
          const hasAppointments = day.count > 0
          const maxDots = 3

          return (
            <motion.button
              key={day.date}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDayClick(day.date)}
              className={cn(
                'relative w-[45px] h-[45px] flex flex-col items-center justify-center rounded-lg transition-all',
                isToday
                  ? 'border-2 ring-2 ring-opacity-50'
                  : 'border border-white/10',
                hasAppointments ? 'bg-white/10' : 'bg-white/5'
              )}
              style={{
                borderColor: isToday ? primaryColor : undefined,
                boxShadow: isToday ? `0 2px 8px ${primaryColor}30` : '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
              aria-label={`${day.dayName}, ${day.dayName} ${day.dayNumber} - ${day.count} appointments`}
            >
              {/* Day Number */}
              <span
                className={cn(
                  'text-xs font-medium',
                  isToday ? 'text-white' : 'text-slate-400'
                )}
              >
                {day.dayNumber}
              </span>

              {/* Appointment Dots */}
              {hasAppointments && day.appointments && day.appointments.length > 0 && (
                <motion.div 
                  className="flex items-center justify-center gap-0.5 mt-0.5"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                >
                  {day.count <= maxDots
                    ? day.appointments.slice(0, maxDots).map((apt, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 + 0.2 + i * 0.05 }}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: getServiceColor(apt.serviceType)
                          }}
                        />
                      ))
                    : (
                        <motion.span
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 + 0.2, type: 'spring', stiffness: 300 }}
                          className="text-xs font-semibold px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: primaryColor,
                            color: 'white'
                          }}
                        >
                          {day.count}
                        </motion.span>
                      )}
                </motion.div>
              )}

              {/* TODAY Badge */}
              {isToday && (
                <motion.span
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.05 + 0.3, type: 'spring', stiffness: 300 }}
                  className="absolute -top-1 -right-1 text-xs font-bold px-1 py-0.5 rounded"
                  style={{
                    backgroundColor: primaryColor,
                    color: 'white'
                  }}
                >
                  TODAY
                </motion.span>
              )}
            </motion.button>
          )
        }) : (
          <div className="w-full text-center py-4">
            <p className="text-slate-400 text-sm">Loading calendar...</p>
          </div>
        )}
      </div>

      {/* Empty State */}
      {days && days.length > 0 && days.every(day => day.count === 0) && (
        <div className="mt-2 text-center">
          <p className="text-xs text-slate-400">No appointments this week</p>
        </div>
      )}
    </motion.div>
  )
})

WeekCalendarWidget.displayName = 'WeekCalendarWidget'

