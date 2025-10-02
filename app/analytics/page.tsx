"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowLeft, 
  TrendingUp, 
  Phone, 
  Calendar, 
  DollarSign, 
  Users,
  Clock,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'

interface AnalyticsData {
  summary: {
    totalCalls: number
    answeredCalls: number
    missedCalls: number
    avgCallDuration: number
    totalAppointments: number
    completedAppointments: number
    scheduledAppointments: number
    cancelledAppointments: number
    conversionRate: number
    estimatedRevenue: number
  }
  insights: {
    topServices: Array<{ service: string; count: number }>
    peakHours: Array<{ hour: string; count: number }>
    answerRate: number
    completionRate: number
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('30d')

  useEffect(() => {
    loadAnalytics()
  }, [timeframe])

  const loadAnalytics = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Please log in to view analytics')
        return
      }

      const response = await fetch(`/api/analytics/business?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()

      if (result.success) {
        setAnalytics(result.data)
      } else {
        console.error('Failed to load analytics:', result.message)
      }
    } catch (error) {
      console.error('Analytics loading error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full"
        />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Analytics Data</h1>
          <p className="text-gray-400 mb-6">Start receiving calls to see your analytics</p>
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
            >
              Back to Dashboard
            </motion.button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Business Analytics</h1>
              <p className="text-gray-400">Track your AI receptionist performance</p>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeframe === period
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Total Calls</h3>
                <p className="text-2xl font-bold text-blue-400">{analytics.summary.totalCalls}</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {analytics.summary.answeredCalls} answered • {analytics.summary.missedCalls} missed
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Appointments</h3>
                <p className="text-2xl font-bold text-green-400">{analytics.summary.totalAppointments}</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {analytics.summary.completedAppointments} completed • {analytics.summary.scheduledAppointments} scheduled
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Conversion Rate</h3>
                <p className="text-2xl font-bold text-purple-400">{analytics.summary.conversionRate}%</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Calls to appointments ratio
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Revenue</h3>
                <p className="text-2xl font-bold text-orange-400">{formatCurrency(analytics.summary.estimatedRevenue)}</p>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Estimated from completed appointments
            </div>
          </motion.div>
        </div>

        {/* Performance Metrics */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Performance Metrics
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Answer Rate</span>
                <span className="text-green-400 font-semibold">{analytics.insights.answerRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Completion Rate</span>
                <span className="text-blue-400 font-semibold">{analytics.insights.completionRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Avg Call Duration</span>
                <span className="text-purple-400 font-semibold">{formatDuration(analytics.summary.avgCallDuration)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Peak Hours
            </h3>
            
            <div className="space-y-3">
              {analytics.insights.peakHours.map((hour, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-300">{hour.hour}</span>
                  <span className="text-orange-400 font-semibold">{hour.count} calls</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Top Services */}
        {analytics.insights.topServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Top Services
            </h3>
            
            <div className="space-y-3">
              {analytics.insights.topServices.map((service, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-300">{service.service}</span>
                  <span className="text-blue-400 font-semibold">{service.count} appointments</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
