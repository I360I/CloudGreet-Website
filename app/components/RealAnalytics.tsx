'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, Calendar, DollarSign, TrendingUp, TrendingDown, 
  Users, Clock, Zap, Target, Award, Activity, BarChart3 
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { logger } from '@/lib/monitoring'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { AnimatedNumber } from './ui/AnimatedNumber'

interface RealMetricsData {
  totalCalls: number
  totalAppointments: number
  totalRevenue: number
  conversionRate: number
  avgCallDuration: number
  customerSatisfaction: number
  monthlyGrowth: number
  revenueProjection: number
  callsThisWeek: number
  appointmentsThisWeek: number
  revenueThisWeek: number
  missedCalls: number
  answeredCalls: number
  callAnswerRate: number
}

interface RealAnalyticsProps {
  businessId?: string
  timeframe?: '7d' | '30d' | '90d'
}

export default function RealAnalytics({ businessId, timeframe = '30d' }: RealAnalyticsProps) {
  const { theme, getServiceColor } = useBusinessData()
  const [metrics, setMetrics] = useState<RealMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const primaryColor = theme?.primaryColor || '#8b5cf6'
  const secondaryColor = theme?.secondaryColor || '#a78bfa'
  
  // Generate colors from business theme
  const callColor = getServiceColor('Calls') || primaryColor
  const appointmentColor = getServiceColor('Appointments') || secondaryColor
  const revenueColor = '#eab308' // Keep yellow for revenue (universal)
  const satisfactionColor = primaryColor

  useEffect(() => {
    loadRealMetrics()
  }, [businessId, timeframe])

  const loadRealMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch real analytics data with automatic authentication
      const response = await fetchWithAuth(`/api/dashboard/real-metrics?timeframe=${timeframe}`)

      if (!response.ok) {
        setError(`Failed to load analytics (${response.status})`)
        return
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        setError('Invalid response from server')
        return
      }
      setMetrics(data.metrics)
    } catch (error) {
      logger.error('Error loading analytics', { error: error instanceof Error ? error.message : 'Unknown error' })
      setError('Error loading analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-lg"
          >
            <div className="h-4 bg-white/10 rounded-lg w-24 mb-4 animate-pulse"></div>
            <div className="h-8 bg-white/10 rounded-lg w-16 mb-2 animate-pulse"></div>
            <div className="h-3 bg-white/10 rounded-lg w-20 animate-pulse"></div>
          </motion.div>
        ))}
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-xl p-6 mb-8 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center"
          >
            <Activity className="w-5 h-5 text-red-400" />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-1">Analytics Unavailable</h3>
            <p className="text-red-300/80 text-sm">{error || 'No data available'}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <div className="w-4 h-4 bg-gray-500 rounded-full" />
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-500'
    if (value < 0) return 'text-red-500'
    return 'text-gray-500'
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:border-white/20"
          style={{ 
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <motion.div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${callColor}20` }}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Phone className="w-6 h-6" style={{ color: callColor }} />
            </motion.div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.monthlyGrowth)}
              <span className={`text-sm font-medium ${getTrendColor(metrics.monthlyGrowth)}`}>
                {metrics.monthlyGrowth > 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">
            <AnimatedNumber value={metrics.totalCalls} />
          </h3>
          <p className="text-gray-400">Total Calls</p>
          <div className="mt-2 text-xs text-gray-500">
            <AnimatedNumber value={metrics.answeredCalls} /> answered, <AnimatedNumber value={metrics.missedCalls} /> missed
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:border-white/20"
          style={{ 
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <motion.div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${appointmentColor}20` }}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Calendar className="w-6 h-6" style={{ color: appointmentColor }} />
            </motion.div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.conversionRate)}
              <span className={`text-sm font-medium ${getTrendColor(metrics.conversionRate)}`}>
                {metrics.conversionRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">
            <AnimatedNumber value={metrics.totalAppointments} />
          </h3>
          <p className="text-gray-400">Appointments</p>
          <div className="mt-2 text-xs text-gray-500">
            <AnimatedNumber value={metrics.appointmentsThisWeek} /> this week
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:border-white/20"
          style={{ 
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <motion.div 
              className="p-3 bg-yellow-500/20 rounded-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </motion.div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.revenueProjection)}
              <span className={`text-sm font-medium ${getTrendColor(metrics.revenueProjection)}`}>
                $<AnimatedNumber value={metrics.revenueProjection} decimals={0} />
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">
            $<AnimatedNumber value={metrics.totalRevenue} decimals={0} />
          </h3>
          <p className="text-gray-400">Revenue</p>
          <div className="mt-2 text-xs text-gray-500">
            $<AnimatedNumber value={metrics.revenueThisWeek} decimals={0} /> this week
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:border-white/20"
          style={{ 
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <motion.div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${satisfactionColor}20` }}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Target className="w-6 h-6" style={{ color: satisfactionColor }} />
            </motion.div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.customerSatisfaction)}
              <span className={`text-sm font-medium ${getTrendColor(metrics.customerSatisfaction)}`}>
                <AnimatedNumber value={metrics.customerSatisfaction} decimals={1} />/5
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">
            <AnimatedNumber value={metrics.callAnswerRate} decimals={1} />%
          </h3>
          <p className="text-gray-400">Answer Rate</p>
          <div className="mt-2 text-xs text-gray-500">
            <AnimatedNumber value={metrics.avgCallDuration} decimals={0} />s avg duration
          </div>
        </motion.div>
      </div>

      {/* Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: primaryColor }} />
          Performance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: appointmentColor }}>{metrics.conversionRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Call to Appointment</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: callColor }}>{metrics.callAnswerRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Call Answer Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: satisfactionColor }}>{metrics.customerSatisfaction.toFixed(1)}/5</div>
            <div className="text-sm text-gray-400">Customer Rating</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
