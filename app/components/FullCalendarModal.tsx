'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, RefreshCw, Settings } from 'lucide-react'
import { Modal } from './ui/Modal'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { LoadingSkeleton } from './ui/LoadingSkeleton'
import { cn } from '@/lib/utils'
import { MonthView } from './calendar/MonthView'
import { WeekView } from './calendar/WeekView'
import { DayView } from './calendar/DayView'
import { AgendaView } from './calendar/AgendaView'

type CalendarView = 'month' | 'week' | 'day' | 'agenda'

interface FullCalendarModalProps {
  open: boolean
  onClose: () => void
  initialDate?: Date
  initialView?: CalendarView
  onAppointmentClick?: (appointment: any) => void
  onCreateAppointment?: () => void
  onDayClick?: (date: Date) => void
}

export function FullCalendarModal({
  open,
  onClose,
  initialDate = new Date(),
  initialView = 'month',
  onAppointmentClick,
  onCreateAppointment,
  onDayClick
}: FullCalendarModalProps) {
  const { theme, business } = useBusinessData()
  const [currentDate, setCurrentDate] = useState(initialDate)
  const [view, setView] = useState<CalendarView>(initialView)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  // Reset date when modal opens
  useEffect(() => {
    if (open) {
      setCurrentDate(initialDate)
      setView(initialView)
    }
  }, [open, initialDate, initialView])

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1)
    } else if (view === 'agenda') {
      newDate.setDate(newDate.getDate() - 7)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1)
    } else if (view === 'agenda') {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDayClickInternal = (date: Date) => {
    setSelectedDate(date)
    if (onDayClick) {
      onDayClick(date)
    }
  }

  const handleAppointmentClick = (appointment: any) => {
    if (onAppointmentClick) {
      onAppointmentClick(appointment)
    }
  }

  const handleEmptySlotClick = (date: Date, time: string) => {
    if (onCreateAppointment) {
      onCreateAppointment()
    }
  }

  const handleCreateAppointment = () => {
    if (onCreateAppointment) {
      onCreateAppointment()
    }
  }

  const views: Array<{ value: CalendarView; label: string }> = [
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
    { value: 'agenda', label: 'Agenda' }
  ]

  const getDateDisplay = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    } else if (view === 'week') {
      const startOfWeek = new Date(currentDate)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day
      startOfWeek.setDate(diff)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    } else {
      return currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    }
  }

  const renderView = () => {
    switch (view) {
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            onDayClick={handleDayClickInternal}
            selectedDate={selectedDate}
            onDateChange={setCurrentDate}
          />
        )
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            onAppointmentClick={handleAppointmentClick}
            onEmptySlotClick={handleEmptySlotClick}
          />
        )
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            onAppointmentClick={handleAppointmentClick}
            onEmptySlotClick={handleEmptySlotClick}
          />
        )
      case 'agenda':
        return (
          <AgendaView
            currentDate={currentDate}
            onAppointmentClick={handleAppointmentClick}
            onCreateAppointment={handleCreateAppointment}
          />
        )
      default:
        return null
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Calendar"
      size="xl"
      aria-labelledby="calendar-modal-title"
      aria-describedby="calendar-modal-description"
    >
      <div className="space-y-4" id="calendar-modal-description">
        {/* Header Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm rounded-lg hover:bg-slate-800/50 transition-colors text-white"
              aria-label="Go to today"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <div className="ml-4 text-white font-medium">
              {getDateDisplay()}
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex items-center gap-2">
            {views.map((v) => {
              const isActive = view === v.value
              return (
                <button
                  key={v.value}
                  onClick={() => setView(v.value)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: primaryColor,
                          color: 'white'
                        }
                      : {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)'
                        }
                  }
                  aria-label={`Switch to ${v.label} view`}
                  aria-pressed={isActive}
                >
                  {v.label}
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
              aria-label="Export calendar"
            >
              <Download className="w-4 h-4 text-slate-400" />
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
              aria-label="Refresh calendar"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
              aria-label="Calendar settings"
            >
              <Settings className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Calendar View Content */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  )
}

