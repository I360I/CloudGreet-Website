'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DateRangePreset = '7d' | '14d' | '30d' | '90d' | 'custom'

interface DateRange {
  start: Date
  end: Date
}

interface DateRangePickerProps {
  value: DateRangePreset
  onChange: (preset: DateRangePreset, range?: DateRange) => void
  customRange?: DateRange
  showComparison?: boolean
  onComparisonToggle?: (enabled: boolean) => void
  className?: string
}

export default function DateRangePicker({
  value,
  onChange,
  customRange,
  showComparison = false,
  onComparisonToggle,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [tempStart, setTempStart] = useState<Date | null>(null)
  const [tempEnd, setTempEnd] = useState<Date | null>(null)
  const [comparisonEnabled, setComparisonEnabled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowCustomPicker(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const presets = [
    { value: '7d' as const, label: 'Last 7 days' },
    { value: '14d' as const, label: 'Last 14 days' },
    { value: '30d' as const, label: 'Last 30 days' },
    { value: '90d' as const, label: 'Last 90 days' },
    { value: 'custom' as const, label: 'Custom range' },
  ]

  const quickPresets = [
    { label: 'Today', onClick: () => {
      const today = new Date()
      onChange('custom', { start: today, end: today })
      setIsOpen(false)
    }},
    { label: 'Yesterday', onClick: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      onChange('custom', { start: yesterday, end: yesterday })
      setIsOpen(false)
    }},
    { label: 'This Week', onClick: () => {
      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay()) // Sunday
      onChange('custom', { start, end: now })
      setIsOpen(false)
    }},
    { label: 'This Month', onClick: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      onChange('custom', { start, end: now })
      setIsOpen(false)
    }},
  ]

  const handlePresetClick = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setShowCustomPicker(true)
      setTempStart(customRange?.start || new Date())
      setTempEnd(customRange?.end || new Date())
    } else {
      onChange(preset)
      setIsOpen(false)
      setShowCustomPicker(false)
    }
  }

  const handleComparisonToggle = () => {
    const newValue = !comparisonEnabled
    setComparisonEnabled(newValue)
    onComparisonToggle?.(newValue)
  }

  const getLabel = () => {
    if (value === 'custom' && customRange) {
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      return `${formatDate(customRange.start)} - ${formatDate(customRange.end)}`
    }
    return presets.find(p => p.value === value)?.label || 'Select range'
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg text-white text-sm font-medium transition-all duration-normal shadow-sm"
        aria-label="Select date range"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <span>{getLabel()}</span>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform duration-normal',
          isOpen && 'rotate-180'
        )} aria-hidden="true" />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-dropdown"
          >
            {!showCustomPicker ? (
              <>
                {/* Presets */}
                <div className="p-3 border-b border-gray-800">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    Date Range
                  </h4>
                  <div className="space-y-1">
                    {presets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => handlePresetClick(preset.value)}
                        className={cn(
                          'w-full text-left px-3 py-2 min-h-[40px] rounded-lg text-sm transition-all duration-normal',
                          value === preset.value
                            ? 'bg-primary-500/10 text-primary-400 font-medium'
                            : 'text-gray-300 hover:bg-gray-800'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="p-3 border-b border-gray-800">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    Quick Select
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={preset.onClick}
                        className="px-3 py-2 min-h-[40px] bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-all duration-normal"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comparison Toggle */}
                {showComparison && (
                  <div className="p-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={comparisonEnabled}
                        onChange={handleComparisonToggle}
                        className="w-5 h-5 min-w-[20px] min-h-[20px] text-primary-500 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-primary-500/20 transition-all"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-300">Compare to previous period</span>
                        <p className="text-xs text-gray-500">Show trend comparison</p>
                      </div>
                    </label>
                  </div>
                )}
              </>
            ) : (
              /* Custom Date Picker */
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white">Select Custom Range</h4>
                  <button
                    onClick={() => setShowCustomPicker(false)}
                    className="min-w-[32px] min-h-[32px] flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    aria-label="Back to presets"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Simple date inputs for MVP */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tempStart?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setTempStart(new Date(e.target.value))}
                      className="w-full px-3 py-2 min-h-[44px] bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tempEnd?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setTempEnd(new Date(e.target.value))}
                      className="w-full px-3 py-2 min-h-[44px] bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (tempStart && tempEnd) {
                        onChange('custom', { start: tempStart, end: tempEnd })
                        setIsOpen(false)
                        setShowCustomPicker(false)
                      }
                    }}
                    disabled={!tempStart || !tempEnd}
                    className="w-full min-h-[44px] px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-normal"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

