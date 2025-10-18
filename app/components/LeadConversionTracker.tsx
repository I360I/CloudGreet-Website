'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  ArrowRight, 
  ArrowDown,
  Clock,
  DollarSign,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  Eye,
  BarChart3
} from 'lucide-react'

interface LeadStage {
  id: string
  name: string
  count: number
  conversionRate: number
  avgTimeInStage: number
  revenue: number
  color: string
  icon: React.ReactNode
}

interface LeadSource {
  id: string
  name: string
  totalLeads: number
  qualifiedLeads: number
  convertedLeads: number
  conversionRate: number
  avgValue: number
  totalRevenue: number
  cost: number
  roas: number
}

interface LeadConversionTrackerProps {
  businessId?: string
  timeframe?: '7d' | '30d' | '90d' | '1y'
  autoRefresh?: boolean
}

export default function LeadConversionTracker({ 
  businessId = 'default',
  timeframe = '30d',
  autoRefresh = true
}: LeadConversionTrackerProps) {
  const [stages, setStages] = useState<LeadStage[]>([])
  const [sources, setSources] = useState<LeadSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'funnel' | 'sources' | 'timeline'>('funnel')
  const [filters, setFilters] = useState({
    minValue: 0,
    maxValue: 10000,
    sourceType: 'all',
    timeRange: timeframe
  })

  // Fetch conversion data
  const fetchConversionData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/conversion?businessId=${businessId}&timeframe=${timeframe}`)
      const result = await response.json()

      if (result.success) {
        setStages(result.stages || [])
        setSources(result.sources || [])
      } else {
        setError(result.error || 'Failed to fetch conversion data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversion data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversionData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchConversionData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [businessId, timeframe, autoRefresh])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`
    } else if (hours < 168) {
      return `${Math.round(hours / 24)}d`
    } else {
      return `${Math.round(hours / 168)}w`
    }
  }

  const getConversionColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600 bg-green-100'
    if (rate >= 50) return 'text-yellow-600 bg-yellow-100'
    if (rate >= 30) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getROASColor = (roas: number) => {
    if (roas >= 4) return 'text-green-600'
    if (roas >= 2) return 'text-yellow-600'
    return 'text-red-600'
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
            <h3 className="font-semibold text-red-800">Conversion Data Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchConversionData}
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
          <h2 className="text-2xl font-bold text-gray-900">Lead Conversion Analytics</h2>
          <p className="text-gray-600">Track and optimize your lead conversion funnel</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="funnel">Funnel View</option>
            <option value="sources">Source Analysis</option>
            <option value="timeline">Timeline</option>
          </select>
          
          <button
            onClick={fetchConversionData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'funnel' && (
          <motion.div
            key="funnel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Funnel Overview */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>
              
              <div className="space-y-4">
                {stages.map((stage, index) => (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedStage === stage.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${stage.color}`}>
                          {stage.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{stage.name}</h4>
                          <p className="text-sm text-gray-600">
                            {stage.count.toLocaleString()} leads
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConversionColor(stage.conversionRate)}`}>
                          {formatPercentage(stage.conversionRate)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDuration(stage.avgTimeInStage)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{formatCurrency(stage.revenue)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (stage.count / Math.max(...stages.map(s => s.count))) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stage Details */}
                    <AnimatePresence>
                      {selectedStage === stage.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-gray-200"
                        >
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{stage.count}</p>
                              <p className="text-sm text-gray-600">Total Leads</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{formatPercentage(stage.conversionRate)}</p>
                              <p className="text-sm text-gray-600">Conversion Rate</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{formatDuration(stage.avgTimeInStage)}</p>
                              <p className="text-sm text-gray-600">Avg. Time</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stage.revenue)}</p>
                              <p className="text-sm text-gray-600">Revenue</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Conversion Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h4 className="font-semibold text-gray-900 mb-4">Overall Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Leads:</span>
                    <span className="font-semibold">{stages[0]?.count.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Converted:</span>
                    <span className="font-semibold">{stages[stages.length - 1]?.count.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overall Rate:</span>
                    <span className="font-semibold">
                      {formatPercentage(
                        stages.length > 0 
                          ? ((stages[stages.length - 1]?.count || 0) / (stages[0]?.count || 1)) * 100
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h4 className="font-semibold text-gray-900 mb-4">Bottlenecks</h4>
                <div className="space-y-3">
                  {stages
                    .filter(stage => stage.conversionRate < 50)
                    .slice(0, 3)
                    .map((stage) => (
                      <div key={stage.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{stage.name}</span>
                        <span className="text-sm font-semibold text-red-600">
                          {formatPercentage(stage.conversionRate)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h4 className="font-semibold text-gray-900 mb-4">Top Performers</h4>
                <div className="space-y-3">
                  {stages
                    .filter(stage => stage.conversionRate >= 70)
                    .slice(0, 3)
                    .map((stage) => (
                      <div key={stage.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{stage.name}</span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatPercentage(stage.conversionRate)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'sources' && (
          <motion.div
            key="sources"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Lead Sources Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Lead Source Performance</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ROAS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sources.map((source) => (
                      <motion.tr
                        key={source.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedSource(selectedSource === source.id ? null : source.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{source.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{source.totalLeads.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">
                            {source.qualifiedLeads} qualified
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConversionColor(source.conversionRate)}`}>
                            {formatPercentage(source.conversionRate)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(source.avgValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(source.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${getROASColor(source.roas)}`}>
                            {source.roas.toFixed(1)}x
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Source Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h4 className="font-semibold text-gray-900 mb-4">Lead Volume by Source</h4>
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{source.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ 
                              width: `${(source.totalLeads / Math.max(...sources.map(s => s.totalLeads))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {source.totalLeads}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h4 className="font-semibold text-gray-900 mb-4">Revenue by Source</h4>
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{source.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ 
                              width: `${(source.totalRevenue / Math.max(...sources.map(s => s.totalRevenue))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-16 text-right">
                          {formatCurrency(source.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Timeline View */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Timeline</h3>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Timeline view coming soon...</p>
                <p className="text-sm">Track lead progression over time</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
