'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TimeSlot } from '@/lib/business-theme'
import { useBusinessData } from '@/app/hooks/useBusinessData'

interface TimePickerProps {
  value: string | null // 'HH:mm' format
  onChange: (time: string | null) => void
  availableSlots?: TimeSlot[]
  businessHours?: Record<string, any>
  date?: Date // Required if checking past times
  className?: string
  placeholder?: string
}

export function TimePicker({
  value,
  onChange,
  availableSlots,
  businessHours,
  date,
  className = '',
  placeholder = 'Select time'
}: TimePickerProps) {
  const { theme } = useBusinessData()
  const primaryColor = theme?.primaryColor || '#8b5cf6'
  const [isOpen, setIsOpen] = useState(false)
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

  const formatTime = (time: string | null): string => {
    if (!time) return placeholder
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
  }

  // Generate time slots if not provided
  const generateTimeSlots = (): TimeSlot[] => {
    if (availableSlots) {
      return availableSlots
    }

    // Default: 8am to 8pm, 30-minute intervals
    const slots: TimeSlot[] = []
    const now = date ? new Date(date) : new Date()
    const isToday = date ? date.toDateString() === new Date().toDateString() : false

    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        const slotTime = new Date(now)
        slotTime.setHours(hour, minute, 0, 0)

        let available = true
        let reason: 'past_time' | undefined = undefined

        // Check if past time (if today)
        if (isToday && slotTime < new Date()) {
          available = false
          reason = 'past_time'
        }

        slots.push({
          time: timeString,
          available,
          reason
        })
      }
    }

    return slots
  }

  const slots = generateTimeSlots()

  const handleTimeClick = (time: string) => {
    const slot = slots.find(s => s.time === time)
    if (slot && slot.available) {
      onChange(time)
      setIsOpen(false)
    }
  }

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
        aria-label="Select time"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{formatTime(value)}</span>
        </div>
      </button>

      {/* Dropdown Time Grid */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 border border-slate-800/50 rounded-xl backdrop-blur-xl z-50 shadow-2xl max-h-80 overflow-y-auto"
          >
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot, index) => {
                  const selected = value === slot.time
                  const [hours, minutes] = slot.time.split(':').map(Number)
                  const period = hours >= 12 ? 'PM' : 'AM'
                  const displayHours = hours % 12 || 12
                  const displayTime = `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`

                  return (
                    <motion.button
                      key={slot.time}
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.01 }}
                      onClick={() => handleTimeClick(slot.time)}
                      disabled={!slot.available}
                      className={cn(
                        'px-3 py-2 text-xs rounded-lg transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-offset-1',
                        !slot.available
                          ? 'text-slate-600 cursor-not-allowed bg-slate-800/30'
                          : selected
                          ? 'text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white bg-slate-800/30'
                      )}
                      style={selected ? {
                        backgroundColor: primaryColor,
                        '--tw-ring-color': primaryColor + '50'
                      } : {
                        '--tw-ring-color': primaryColor + '50'
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      aria-label={`Select ${displayTime}`}
                      aria-selected={selected}
                      aria-disabled={!slot.available}
                    >
                      {displayTime}
                    </motion.button>
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

