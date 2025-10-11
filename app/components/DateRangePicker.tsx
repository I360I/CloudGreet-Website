'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronDown } from 'lucide-react'

interface DateRange {
  label: string
  value: string
  days: number
}

interface DateRangePickerProps {
  value: string
  onChange: (value: string) => void
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const ranges: DateRange[] = [
    { label: 'Last 7 days', value: '7d', days: 7 },
    { label: 'Last 14 days', value: '14d', days: 14 },
    { label: 'Last 30 days', value: '30d', days: 30 },
    { label: 'Last 90 days', value: '90d', days: 90 },
    { label: 'This month', value: 'month', days: 30 },
    { label: 'Last 6 months', value: '6m', days: 180 },
    { label: 'This year', value: 'year', days: 365 }
  ]

  const selectedRange = ranges.find(r => r.value === value) || ranges[2]

  const handleSelect = (rangeValue: string) => {
    onChange(rangeValue)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/15 transition-colors text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <Calendar className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium">{selectedRange.label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {ranges.map((range, index) => (
                <motion.button
                  key={range.value}
                  onClick={() => handleSelect(range.value)}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    value === range.value
                      ? 'bg-blue-500/20 text-blue-400 font-medium'
                      : 'text-gray-300 hover:text-white'
                  } ${index !== ranges.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  {range.label}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

