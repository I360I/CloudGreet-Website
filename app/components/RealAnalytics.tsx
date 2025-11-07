'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, Calendar, DollarSign, TrendingUp, TrendingDown, 
  Users, Clock, Zap, Target, Award, Activity, BarChart3 
} from 'lucide-react'

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
  const [metrics, setMetrics] = useState<RealMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRealMetrics()
  }, [businessId, timeframe])

  const loadRealMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to view analytics')
        return
      }

      // Fetch real analytics data
      const response = await fetch(`/api/dashboard/real-metrics?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
      } else {
        setError('Failed to load analytics')
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      setError('Error loading analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700/50 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-700/50 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-700/50 rounded w-20"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <Activity className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-400">Analytics Unavailable</h3>
            <p className="text-red-300 text-sm">{error || 'No data available'}</p>
          </div>
        </div>
      </div>
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
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Phone className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.monthlyGrowth)}
              <span className={`text-sm font-medium ${getTrendColor(metrics.monthlyGrowth)}`}>
                {metrics.monthlyGrowth > 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">{metrics.totalCalls}</h3>
          <p className="text-gray-400">Total Calls</p>
          <div className="mt-2 text-xs text-gray-500">
            {metrics.answeredCalls} answered, {metrics.missedCalls} missed
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.conversionRate)}
              <span className={`text-sm font-medium ${getTrendColor(metrics.conversionRate)}`}>
                {metrics.conversionRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">{metrics.totalAppointments}</h3>
          <p className="text-gray-400">Appointments</p>
          <div className="mt-2 text-xs text-gray-500">
            {metrics.appointmentsThisWeek} this week
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.revenueProjection)}
              <span className={`text-sm font-medium ${getTrendColor(metrics.revenueProjection)}`}>
                ${metrics.revenueProjection.toFixed(0)}
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">${metrics.totalRevenue.toFixed(0)}</h3>
          <p className="text-gray-400">Revenue</p>
          <div className="mt-2 text-xs text-gray-500">
            ${metrics.revenueThisWeek.toFixed(0)} this week
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.customerSatisfaction)}
              <span className={`text-sm font-medium ${getTrendColor(metrics.customerSatisfaction)}`}>
                {metrics.customerSatisfaction.toFixed(1)}/5
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">{metrics.callAnswerRate.toFixed(1)}%</h3>
          <p className="text-gray-400">Answer Rate</p>
          <div className="mt-2 text-xs text-gray-500">
            {metrics.avgCallDuration.toFixed(0)}s avg duration
          </div>
        </motion.div>
      </div>

      {/* Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Performance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{metrics.conversionRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Call to Appointment</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{metrics.callAnswerRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Call Answer Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{metrics.customerSatisfaction.toFixed(1)}/5</div>
            <div className="text-sm text-gray-400">Customer Rating</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
