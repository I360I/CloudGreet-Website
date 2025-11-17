'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, DollarSign, Calendar, Zap } from 'lucide-react'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { LoadingSkeleton } from './ui/LoadingSkeleton'
import { AnimatedNumber } from './ui/AnimatedNumber'
import { cn } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

interface DashboardHeroProps {
  timeframe?: '7d' | '30d' | '90d' | 'custom'
  onTimeframeChange?: (timeframe: '7d' | '30d' | '90d' | 'custom') => void
}

interface QuickStats {
  callsToday: number
  revenueThisWeek: number
  appointmentsToday: number
}

export function DashboardHero({
  timeframe = '7d',
  onTimeframeChange
}: DashboardHeroProps) {
  const { business, theme, loading, getBusinessLabel } = useBusinessData()
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  React.useEffect(() => {
    loadQuickStats()
  }, [])

  const loadQuickStats = async () => {
    try {
      setStatsLoading(true)
      // Fetch quick stats from dashboard data API
      const response = await fetchWithAuth('/api/dashboard/data')
      if (response.ok) {
        const data = await response.json()
        setStats({
          callsToday: data.totalCalls || 0,
          revenueThisWeek: data.totalRevenue || 0,
          appointmentsToday: data.totalAppointments || 0
        })
      }
    } catch (err) {
      console.error('Failed to load quick stats', err)
    } finally {
      setStatsLoading(false)
    }
  }

  if (loading || !theme || !business) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton width="100%" height={60} />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <LoadingSkeleton key={i} width="100%" height={100} />
          ))}
        </div>
      </div>
    )
  }

  const primaryColor = theme.primaryColor
  const appointmentLabel = getBusinessLabel('appointment')

  const timeframes: Array<{ value: '7d' | '30d' | '90d' | 'custom'; label: string }> = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: 'custom', label: 'Custom' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            Welcome back, {business.name}
          </h1>
          <p className="text-slate-400 text-sm">
            Here's what's happening with your business today
          </p>
        </div>

        {/* AI Status Badge */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all"
          style={{
            backgroundColor: `${primaryColor}20`,
            borderColor: `${primaryColor}30`,
            borderWidth: '1px'
          }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Zap className="w-4 h-4" style={{ color: primaryColor }} />
          </motion.div>
          <span className="text-sm font-medium text-white">AI Active</span>
        </motion.div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Calls Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="p-4 rounded-xl bg-slate-800/50 backdrop-blur-xl border cursor-pointer transition-all"
          style={{ 
            borderColor: `${primaryColor}30`,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <Phone className="w-5 h-5" style={{ color: primaryColor }} />
            <span className="text-xs text-slate-400">Today</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {statsLoading ? (
              <LoadingSkeleton width={60} height={32} />
            ) : (
              <AnimatedNumber value={stats?.callsToday || 0} />
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">Calls</div>
        </motion.div>

        {/* Revenue This Week */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="p-4 rounded-xl bg-slate-800/50 backdrop-blur-xl border cursor-pointer transition-all"
          style={{ 
            borderColor: `${primaryColor}30`,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5" style={{ color: primaryColor }} />
            <span className="text-xs text-slate-400">This Week</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {statsLoading ? (
              <LoadingSkeleton width={80} height={32} />
            ) : (
              <AnimatedNumber value={stats?.revenueThisWeek || 0} prefix="$" decimals={0} />
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">Revenue</div>
        </motion.div>

        {/* Appointments Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="p-4 rounded-xl bg-slate-800/50 backdrop-blur-xl border cursor-pointer transition-all"
          style={{ 
            borderColor: `${primaryColor}30`,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
            <span className="text-xs text-slate-400">Today</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {statsLoading ? (
              <LoadingSkeleton width={60} height={32} />
            ) : (
              <AnimatedNumber value={stats?.appointmentsToday || 0} />
            )}
          </div>
          <div className="text-xs text-slate-400 mt-1">{appointmentLabel}s</div>
        </motion.div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-2">
        {timeframes.map((tf, index) => {
          const isActive = timeframe === tf.value
          return (
            <motion.button
              key={tf.value}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTimeframeChange?.(tf.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white'
              )}
              style={
                isActive
                  ? {
                      backgroundColor: primaryColor,
                      color: 'white',
                      boxShadow: `0 4px 12px ${primaryColor}40`
                    }
                  : {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }
              }
            >
              {tf.label}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

