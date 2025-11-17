'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBusinessData } from '@/app/hooks/useBusinessData'

interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
  disabledDates?: Date[]
  businessHours?: Record<string, any>
  className?: string
  placeholder?: string
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabledDates = [],
  businessHours,
  className = '',
  placeholder = 'Select date'
}: DatePickerProps) {
  const { theme } = useBusinessData()
  const primaryColor = theme?.primaryColor || '#8b5cf6'
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(value || new Date())
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen])

  const formatDate = (date: Date | null): string => {
    if (!date) return placeholder
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const isDateDisabled = (date: Date): boolean => {
    // Check minDate
    if (minDate && date < minDate) {
      return true
    }
    
    // Check maxDate
    if (maxDate && date > maxDate) {
      return true
    }
    
    // Check disabledDates
    if (disabledDates.some(d => d.toDateString() === date.toDateString())) {
      return true
    }
    
    // Check business hours (if provided)
    if (businessHours) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayOfWeek = dayNames[date.getDay()]
      const dayHours = businessHours[dayOfWeek]
      
      if (!dayHours || !dayHours.enabled) {
        return true
      }
    }
    
    return false
  }

  const isDateSelected = (date: Date): boolean => {
    if (!value) return false
    return date.toDateString() === value.toDateString()
  }

  const isToday = (date: Date): boolean => {
    return date.toDateString() === new Date().toDateString()
  }

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return
    onChange(date)
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const days = getDaysInMonth(currentMonth)

  return (
    <div ref={pickerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-2',
          'bg-slate-800/50 border border-slate-700/50 rounded-lg',
          'hover:bg-slate-800/70 transition-colors',
          'text-white text-sm',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900'
        )}
        style={{ 
          '--tw-ring-color': primaryColor + '50'
        } as React.CSSProperties & { '--tw-ring-color'?: string }}
        aria-label="Select date"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{formatDate(value)}</span>
        </div>
      </button>

      {/* Dropdown Calendar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-80 bg-slate-900/95 border border-slate-800/50 rounded-xl backdrop-blur-xl z-50 shadow-2xl"
          >
            <div className="p-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 bg-slate-800/50 border border-slate-700/50 rounded-lg flex items-center justify-center hover:bg-slate-800/70 transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
                
                <h3 className="text-white font-semibold">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 bg-slate-800/50 border border-slate-700/50 rounded-lg flex items-center justify-center hover:bg-slate-800/70 transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="text-center text-xs text-slate-400 py-2 font-medium">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={index} className="h-8" />
                  }

                  const selected = isDateSelected(date)
                  const today = isToday(date)
                  const disabled = isDateDisabled(date)

                  return (
                    <button
                      key={date.getTime()}
                      type="button"
                      onClick={() => handleDateClick(date)}
                      disabled={disabled}
                      className={cn(
                        'h-8 text-xs rounded-lg transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-offset-1',
                        disabled
                          ? 'text-slate-600 cursor-not-allowed'
                          : selected
                          ? 'text-white font-semibold'
                          : today
                          ? 'bg-slate-700/50 text-white font-medium'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      )}
                      style={selected ? {
                        backgroundColor: primaryColor,
                        '--tw-ring-color': primaryColor + '50'
                      } : {
                        '--tw-ring-color': primaryColor + '50'
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      aria-label={`Select ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                      aria-selected={selected}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

