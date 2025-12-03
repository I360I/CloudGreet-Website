'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { WeekCalendarWidget } from './WeekCalendarWidget'
import RealActivityFeed from './RealActivityFeed'
import { LoadingSkeleton } from './ui/LoadingSkeleton'

interface ControlCenterProps {
  onDayClick?: (date: string) => void
  onFullCalendarClick?: () => void
  onCreateAppointment?: () => void
}

export function ControlCenter({
  onDayClick,
  onFullCalendarClick,
  onCreateAppointment
}: ControlCenterProps) {
  const { theme, loading } = useBusinessData()

  if (loading || !theme) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton width="100%" height={120} />
        <LoadingSkeleton width="100%" height={200} />
        <LoadingSkeleton width="100%" height={300} />
      </div>
    )
  }

  const primaryColor = theme.primaryColor

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="sticky top-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
    >
      {/* AI Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.02 }}
        className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:border-white/20"
        style={{ 
          borderColor: `${primaryColor}30`,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">AI Status</h3>
            <p className="text-xs text-slate-400">All systems operational</p>
          </div>
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: primaryColor }}
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>

      {/* Week Calendar Widget */}
      <WeekCalendarWidget
        onDayClick={onDayClick}
        onFullCalendarClick={onFullCalendarClick}
      />

      {/* Quick Actions Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg"
        style={{ 
          borderColor: `${primaryColor}30`,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <motion.button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onCreateAppointment) {
                onCreateAppointment()
              }
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-4 py-2 text-sm rounded-lg transition-all"
            style={{
              backgroundColor: `${primaryColor}20`,
              color: primaryColor,
              borderColor: `${primaryColor}30`,
              borderWidth: '1px',
              boxShadow: `0 2px 4px ${primaryColor}20`
            }}
          >
            Create Appointment
          </motion.button>
        </div>
      </motion.div>

      {/* Activity Feed */}
      <div>
        <RealActivityFeed />
      </div>
    </motion.div>
  )
}

