'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity, 
  Target,
  Clock,
  Users,
  DollarSign,
  Phone,
  Calendar,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react'

interface AnalyticsData {
  revenue: {
    total: number
    monthly: number
    weekly: number
    daily: number
    growth: number
    projection: number
  }
  calls: {
    total: number
    answered: number
    missed: number
    conversionRate: number
    averageDuration: number
    peakHours: { hour: number; count: number }[]
  }
  appointments: {
    total: number
    completed: number
    cancelled: number
    noShow: number
    completionRate: number
    averageValue: number
  }
  leads: {
    total: number
    qualified: number
    converted: number
    conversionRate: number
    sources: { source: string; count: number; conversion: number }[]
  }
  performance: {
    systemUptime: number
    responseTime: number
    errorRate: number
    satisfaction: number
  }
  trends: {
    daily: { date: string; calls: number; appointments: number; revenue: number }[]
    weekly: { week: string; calls: number; appointments: number; revenue: number }[]
    monthly: { month: string; calls: number; appointments: number; revenue: number }[]
  }
}

interface AdvancedAnalyticsProps {
  businessId?: string
  timeframe?: '7d' | '30d' | '90d' | '1y'
  refreshInterval?: number
}

export default function AdvancedAnalytics({ 
  businessId = 'default',
  timeframe: initialTimeframe = '30d',
  refreshInterval = 30000
}: AdvancedAnalyticsProps) {
  const [timeframe, setTimeframe] = useState(initialTimeframe)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<string>('overview')
  const [comparisonPeriod, setComparisonPeriod] = useState<string>('previous')

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/advanced?businessId=${businessId}&timeframe=${timeframe}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setLastUpdated(new Date())
      } else {
        setError(result.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh
  useEffect(() => {
    fetchAnalytics()
    
    const interval = setInterval(fetchAnalytics, refreshInterval)
    return () => clearInterval(interval)
  }, [businessId, timeframe, refreshInterval])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Activity className="w-4 h-4 text-gray-500" />
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-800">Analytics Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
          <p className="text-gray-600">
            Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(data.revenue.growth)}
              <span className={`text-sm font-medium ${getTrendColor(data.revenue.growth)}`}>
                {formatPercentage(data.revenue.growth)}
              </span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenue.total)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Projected: {formatCurrency(data.revenue.projection)}
          </p>
        </motion.div>

        {/* Calls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-blue-600">
                {data.calls.conversionRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Calls</h3>
          <p className="text-2xl font-bold text-gray-900">{data.calls.total.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Answered: {data.calls.answered} | Missed: {data.calls.missed}
          </p>
        </motion.div>

        {/* Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-purple-600">
                {data.appointments.completionRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Appointments</h3>
          <p className="text-2xl font-bold text-gray-900">{data.appointments.total}</p>
          <p className="text-xs text-gray-500 mt-1">
            Avg Value: {formatCurrency(data.appointments.averageValue)}
          </p>
        </motion.div>

        {/* Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-orange-600">
                {data.performance.satisfaction.toFixed(1)}/5
              </span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Satisfaction</h3>
          <p className="text-2xl font-bold text-gray-900">{data.performance.satisfaction.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Uptime: {data.performance.systemUptime}%
          </p>
        </motion.div>
      </div>

      {/* Detailed Analytics Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'revenue', label: 'Revenue', icon: DollarSign },
              { id: 'calls', label: 'Calls', icon: Phone },
              { id: 'appointments', label: 'Appointments', icon: Calendar },
              { id: 'performance', label: 'Performance', icon: Activity }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedMetric(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  selectedMetric === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {selectedMetric === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{data.calls.averageDuration}m</p>
                    <p className="text-sm text-gray-600">Avg Call Duration</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{data.leads.conversionRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">Lead Conversion</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{data.performance.responseTime}ms</p>
                    <p className="text-sm text-gray-600">Response Time</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{data.performance.errorRate.toFixed(2)}%</p>
                    <p className="text-sm text-gray-600">Error Rate</p>
                  </div>
                </div>

                {/* Peak Hours Chart */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Call Hours</h3>
                  <div className="grid grid-cols-12 gap-2">
                    {data.calls.peakHours.map((hour, index) => (
                      <div key={hour.hour} className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          {hour.hour === 0 ? '12AM' : hour.hour < 12 ? `${hour.hour}AM` : hour.hour === 12 ? '12PM' : `${hour.hour - 12}PM`}
                        </div>
                        <div className="bg-blue-100 rounded-sm relative h-20">
                          <div
                            className="bg-blue-500 rounded-sm absolute bottom-0 w-full transition-all duration-500"
                            style={{ height: `${(hour.count / Math.max(...data.calls.peakHours.map(h => h.count))) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{hour.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {selectedMetric === 'revenue' && (
              <motion.div
                key="revenue"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Daily Average</p>
                          <p className="text-xl font-semibold">{formatCurrency(data.revenue.daily)}</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Weekly Average</p>
                          <p className="text-xl font-semibold">{formatCurrency(data.revenue.weekly)}</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Monthly Average</p>
                          <p className="text-xl font-semibold">{formatCurrency(data.revenue.monthly)}</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Sources</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Appointments</span>
                        <span className="font-semibold">{formatCurrency(data.appointments.total * data.appointments.averageValue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Consultations</span>
                        <span className="font-semibold">{formatCurrency(data.revenue.total * 0.2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Emergency Calls</span>
                        <span className="font-semibold">{formatCurrency(data.revenue.total * 0.1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Additional metric tabs would go here */}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
