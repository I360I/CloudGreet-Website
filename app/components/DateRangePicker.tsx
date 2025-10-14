'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateRange {
  start: Date
  end: Date
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export default function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatRange = () => {
    if (value.start && value.end) {
      return `${formatDate(value.start)} - ${formatDate(value.end)}`
    }
    return 'Select date range'
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
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

  const isDateInRange = (date: Date) => {
    if (!value.start || !value.end) return false
    return date >= value.start && date <= value.end
  }

  const isDateSelected = (date: Date) => {
    if (!value.start && !value.end) return false
    if (value.start && date.getTime() === value.start.getTime()) return true
    if (value.end && date.getTime() === value.end.getTime()) return true
    return false
  }

  const handleDateClick = (date: Date) => {
    if (!value.start || (value.start && value.end)) {
      // Start new selection
      onChange({ start: date, end: date })
    } else if (date < value.start) {
      // Date is before start, make it the new start
      onChange({ start: date, end: value.start })
    } else {
      // Date is after start, make it the end
      onChange({ start: value.start, end: date })
    }
  }

  const quickRanges = [
    {
      label: 'Today',
      getRange: () => {
        const today = new Date()
        return { start: today, end: today }
      }
    },
    {
      label: 'Last 7 days',
      getRange: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - 6)
        return { start, end }
      }
    },
    {
      label: 'Last 30 days',
      getRange: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - 29)
        return { start, end }
      }
    },
    {
      label: 'This month',
      getRange: () => {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return { start, end }
      }
    }
  ]

  const days = getDaysInMonth(currentMonth)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-800/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-white text-sm">{formatRange()}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-96 bg-gray-900/95 border border-gray-800/50 rounded-xl backdrop-blur-xl z-50 shadow-2xl"
          >
            <div className="p-4">
              {/* Quick Ranges */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Quick Select</h3>
                <div className="grid grid-cols-2 gap-2">
                  {quickRanges.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => {
                        onChange(range.getRange())
                        setIsOpen(false)
                      }}
                      className="px-3 py-2 text-xs bg-gray-800/50 border border-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-800/70 hover:text-white transition-colors"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div className="border-t border-gray-800/50 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="w-8 h-8 bg-gray-800/50 border border-gray-700/50 rounded-lg flex items-center justify-center hover:bg-gray-800/70 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  <h3 className="text-white font-semibold">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                  
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="w-8 h-8 bg-gray-800/50 border border-gray-700/50 rounded-lg flex items-center justify-center hover:bg-gray-800/70 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="text-center text-xs text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((date, index) => {
                    if (!date) {
                      return <div key={index} className="h-8" />
                    }

                    const isSelected = isDateSelected(date)
                    const isInRange = isDateInRange(date)
                    const isToday = date.toDateString() === new Date().toDateString()

                    return (
                      <button
                        key={date.getTime()}
                        onClick={() => handleDateClick(date)}
                        className={`h-8 text-xs rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : isInRange
                            ? 'bg-blue-500/20 text-blue-400'
                            : isToday
                            ? 'bg-gray-700/50 text-white'
                            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-800/50">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm bg-gray-800/50 border border-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-800/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}