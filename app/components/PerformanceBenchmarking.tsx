'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  BarChart3,
  Users,
  Clock,
  DollarSign,
  Phone,
  Calendar,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Filter,
  Download,
  Eye,
  Star,
  Trophy,
  Medal,
  Crown
} from 'lucide-react'

interface BenchmarkMetric {
  id: string
  name: string
  value: number
  benchmark: number
  industry: number
  percentile: number
  trend: 'up' | 'down' | 'stable'
  change: number
  unit: string
  description: string
  icon: React.ReactNode
}

interface CompetitorComparison {
  id: string
  name: string
  type: 'direct' | 'indirect' | 'aspirational'
  metrics: {
    responseTime: number
    conversionRate: number
    satisfaction: number
    marketShare: number
  }
  strengths: string[]
  weaknesses: string[]
}

interface PerformanceBenchmarkingProps {
  businessId?: string
  timeframe?: '7d' | '30d' | '90d' | '1y'
  autoRefresh?: boolean
}

export default function PerformanceBenchmarking({ 
  businessId = 'default',
  timeframe = '30d',
  autoRefresh = true
}: PerformanceBenchmarkingProps) {
  const [metrics, setMetrics] = useState<BenchmarkMetric[]>([])
  const [competitors, setCompetitors] = useState<CompetitorComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'competitors'>('overview')
  const [benchmarkType, setBenchmarkType] = useState<'industry' | 'top_performers' | 'custom'>('industry')
  const [filters, setFilters] = useState({
    category: 'all',
    importance: 'all',
    timeframe: timeframe
  })

  // Fetch benchmarking data
  const fetchBenchmarkData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/benchmarks?businessId=${businessId}&timeframe=${timeframe}`)
      const result = await response.json()

      if (result.success) {
        setMetrics(result.metrics || [])
        setCompetitors(result.competitors || [])
      } else {
        setError(result.error || 'Failed to fetch benchmark data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch benchmark data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBenchmarkData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchBenchmarkData, 300000) // Refresh every 5 minutes
      return () => clearInterval(interval)
    }
  }, [businessId, timeframe, autoRefresh])

  const formatValue = (value: number, unit: string) => {
    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'time':
        return `${Math.round(value)}s`
      case 'rating':
        return `${value.toFixed(1)}/5`
      case 'count':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  const getPerformanceColor = (percentile: number) => {
    if (percentile >= 90) return 'text-green-600 bg-green-100'
    if (percentile >= 75) return 'text-blue-600 bg-blue-100'
    if (percentile >= 50) return 'text-yellow-600 bg-yellow-100'
    if (percentile >= 25) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getPerformanceIcon = (percentile: number) => {
    if (percentile >= 90) return <Crown className="w-5 h-5 text-green-600" />
    if (percentile >= 75) return <Trophy className="w-5 h-5 text-blue-600" />
    if (percentile >= 50) return <Medal className="w-5 h-5 text-yellow-600" />
    if (percentile >= 25) return <Award className="w-5 h-5 text-orange-600" />
    return <Target className="w-5 h-5 text-red-600" />
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <BarChart3 className="w-4 h-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
            <h3 className="font-semibold text-red-800">Benchmark Data Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchBenchmarkData}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Benchmarking</h2>
          <p className="text-gray-600">Compare your performance against industry standards and competitors</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={benchmarkType}
            onChange={(e) => setBenchmarkType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="industry">Industry Average</option>
            <option value="top_performers">Top Performers</option>
            <option value="custom">Custom Benchmark</option>
          </select>
          
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="overview">Overview</option>
            <option value="detailed">Detailed Analysis</option>
            <option value="competitors">Competitor Comparison</option>
          </select>
          
          <button
            onClick={fetchBenchmarkData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Performance Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Trophy className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-green-600">Top 10%</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Overall Performance</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.filter(m => m.percentile >= 90).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">metrics in top 10%</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-blue-600">Above Average</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Benchmark Performance</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.filter(m => m.percentile >= 50).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">metrics above median</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="text-sm font-medium text-yellow-600">Improving</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Trending Up</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.filter(m => m.trend === 'up').length}
                </p>
                <p className="text-xs text-gray-500 mt-1">metrics improving</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-red-600">Needs Attention</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">Below Average</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.filter(m => m.percentile < 25).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">metrics need improvement</p>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {metrics.slice(0, 6).map((metric) => (
                <motion.div
                  key={metric.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-lg p-6 shadow-sm border cursor-pointer hover:shadow-md transition-all ${
                    selectedMetric === metric.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${getPerformanceColor(metric.percentile)}`}>
                      {metric.icon}
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(metric.trend)}
                      <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                        {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{metric.name}</h3>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {formatValue(metric.value, metric.unit)}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Benchmark:</span>
                    <span className="font-medium">{formatValue(metric.benchmark, metric.unit)}</span>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Performance</span>
                      <span>{metric.percentile}th percentile</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          metric.percentile >= 75 ? 'bg-green-500' :
                          metric.percentile >= 50 ? 'bg-blue-500' :
                          metric.percentile >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${metric.percentile}%` }}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedMetric === metric.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-gray-200"
                      >
                        <p className="text-sm text-gray-600 mb-3">{metric.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Your Value:</span>
                            <p className="font-semibold">{formatValue(metric.value, metric.unit)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Industry Avg:</span>
                            <p className="font-semibold">{formatValue(metric.industry, metric.unit)}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-center">
                          {getPerformanceIcon(metric.percentile)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {viewMode === 'detailed' && (
          <motion.div
            key="detailed"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Detailed Metrics Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Detailed Performance Analysis</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Metric
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Your Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Benchmark
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentile
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {metrics.map((metric) => (
                      <motion.tr
                        key={metric.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`p-1 rounded ${getPerformanceColor(metric.percentile)}`}>
                              {metric.icon}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{metric.name}</div>
                              <div className="text-sm text-gray-500">{metric.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatValue(metric.value, metric.unit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatValue(metric.benchmark, metric.unit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatValue(metric.industry, metric.unit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(metric.percentile)}`}>
                            {getPerformanceIcon(metric.percentile)}
                            {metric.percentile}th
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {getTrendIcon(metric.trend)}
                            <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                              {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'competitors' && (
          <motion.div
            key="competitors"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Competitor Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {competitors.map((competitor) => (
                <motion.div
                  key={competitor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg p-6 shadow-sm border"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{competitor.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      competitor.type === 'direct' ? 'bg-red-100 text-red-800' :
                      competitor.type === 'indirect' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {competitor.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Response Time:</span>
                      <span className="text-sm font-semibold">{competitor.metrics.responseTime}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Conversion Rate:</span>
                      <span className="text-sm font-semibold">{competitor.metrics.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Satisfaction:</span>
                      <span className="text-sm font-semibold">{competitor.metrics.satisfaction.toFixed(1)}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Market Share:</span>
                      <span className="text-sm font-semibold">{competitor.metrics.marketShare.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-green-700">Strengths:</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {competitor.strengths.map((strength, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 mt-3">
                    <h4 className="text-sm font-semibold text-red-700">Weaknesses:</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {competitor.weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
