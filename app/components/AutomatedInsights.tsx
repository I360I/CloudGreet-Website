'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  BarChart3,
  Users,
  DollarSign,
  Clock,
  Phone,
  Calendar,
  MessageSquare,
  Zap,
  RefreshCw,
  Download,
  Share,
  Bookmark,
  Eye,
  EyeOff,
  Filter,
  Search,
  ArrowRight,
  ArrowDown,
  Star,
  Flag,
  Bell
} from 'lucide-react'

interface Insight {
  id: string
  type: 'opportunity' | 'warning' | 'success' | 'trend' | 'anomaly'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: 'positive' | 'negative' | 'neutral'
  confidence: number
  metrics: {
    current: number
    previous: number
    change: number
    benchmark: number
  }
  recommendations: string[]
  actions: {
    id: string
    title: string
    description: string
    effort: 'low' | 'medium' | 'high'
    impact: 'low' | 'medium' | 'high'
    category: 'immediate' | 'short_term' | 'long_term'
  }[]
  tags: string[]
  createdAt: Date
  expiresAt?: Date
  isRead: boolean
  isBookmarked: boolean
  category: string
  source: string
}

interface AutomatedInsightsProps {
  businessId?: string
  timeframe?: '7d' | '30d' | '90d' | '1y'
  autoRefresh?: boolean
}

export default function AutomatedInsights({ 
  businessId = 'default',
  timeframe = '30d',
  autoRefresh = true
}: AutomatedInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    type: 'all',
    priority: 'all',
    category: 'all',
    read: 'all',
    search: ''
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'priority'>('priority')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Fetch insights data
  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/insights?businessId=${businessId}&timeframe=${timeframe}`)
      const result = await response.json()

      if (result.success) {
        setInsights(result.insights || [])
      } else {
        setError(result.error || 'Failed to fetch insights')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
    
    if (autoRefresh) {
      const interval = setInterval(fetchInsights, 300000) // Refresh every 5 minutes
      return () => clearInterval(interval)
    }
  }, [businessId, timeframe, autoRefresh])

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="w-5 h-5 text-yellow-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'trend':
        return <TrendingUp className="w-5 h-5 text-blue-600" />
      case 'anomaly':
        return <Target className="w-5 h-5 text-purple-600" />
      default:
        return <Lightbulb className="w-5 h-5 text-gray-600" />
    }
  }

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return 'border-yellow-200 bg-yellow-50'
      case 'warning':
        return 'border-orange-200 bg-orange-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'trend':
        return 'border-blue-200 bg-blue-50'
      case 'anomaly':
        return 'border-purple-200 bg-purple-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getPriorityColor = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getImpactIcon = (impact: Insight['impact']) => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <BarChart3 className="w-4 h-4 text-gray-500" />
    }
  }

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const markAsRead = (insightId: string) => {
    setInsights(prev => prev.map(insight => 
      insight.id === insightId ? { ...insight, isRead: true } : insight
    ))
  }

  const toggleBookmark = (insightId: string) => {
    setInsights(prev => prev.map(insight => 
      insight.id === insightId ? { ...insight, isBookmarked: !insight.isBookmarked } : insight
    ))
  }

  const filteredInsights = insights.filter(insight => {
    if (filters.type !== 'all' && insight.type !== filters.type) return false
    if (filters.priority !== 'all' && insight.priority !== filters.priority) return false
    if (filters.category !== 'all' && insight.category !== filters.category) return false
    if (filters.read === 'read' && !insight.isRead) return false
    if (filters.read === 'unread' && insight.isRead) return false
    if (filters.search && !insight.title.toLowerCase().includes(filters.search.toLowerCase()) && 
        !insight.description.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const groupedInsights = filteredInsights.reduce((acc, insight) => {
    if (!acc[insight.category]) {
      acc[insight.category] = []
    }
    acc[insight.category].push(insight)
    return acc
  }, {} as Record<string, Insight[]>)

  const unreadCount = insights.filter(i => !i.isRead).length
  const highPriorityCount = insights.filter(i => i.priority === 'high' && !i.isRead).length

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
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-800">Insights Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchInsights}
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
          <h2 className="text-2xl font-bold text-gray-900">Automated Insights</h2>
          <p className="text-gray-600">AI-powered insights and recommendations for your business</p>
        </div>
        
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              <Bell className="w-4 h-4" />
              {unreadCount} new
            </div>
          )}
          
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="priority">By Priority</option>
            <option value="grid">Grid View</option>
            <option value="list">List View</option>
          </select>
          
          <button
            onClick={fetchInsights}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="opportunity">Opportunities</option>
            <option value="warning">Warnings</option>
            <option value="success">Successes</option>
            <option value="trend">Trends</option>
            <option value="anomaly">Anomalies</option>
          </select>
          
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
          
          <select
            value={filters.read}
            onChange={(e) => setFilters({ ...filters, read: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search insights..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* High Priority Alerts */}
      {highPriorityCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800">High Priority Insights</h3>
              <p className="text-red-600 text-sm">
                You have {highPriorityCount} high-priority insights that require immediate attention.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights Display */}
      {viewMode === 'priority' && (
        <div className="space-y-6">
          {Object.entries(groupedInsights).map(([category, categoryInsights]) => (
            <div key={category} className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedCategories)
                  if (expandedCategories.has(category)) {
                    newExpanded.delete(category)
                  } else {
                    newExpanded.add(category)
                  }
                  setExpandedCategories(newExpanded)
                }}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    {categoryInsights.length}
                  </span>
                  {categoryInsights.filter(i => !i.isRead).length > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                      {categoryInsights.filter(i => !i.isRead).length} new
                    </span>
                  )}
                </div>
                {expandedCategories.has(category) ? (
                  <ArrowDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedCategories.has(category) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-gray-200"
                  >
                    <div className="p-6 space-y-4">
                      {categoryInsights.map((insight) => (
                        <motion.div
                          key={insight.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                            getInsightColor(insight.type)
                          } ${!insight.isRead ? 'ring-2 ring-blue-200' : ''}`}
                          onClick={() => {
                            setSelectedInsight(selectedInsight === insight.id ? null : insight.id)
                            if (!insight.isRead) markAsRead(insight.id)
                          }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              {getInsightIcon(insight.type)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(insight.priority)}`}>
                                    {insight.priority}
                                  </span>
                                  {insight.isBookmarked && (
                                    <Bookmark className="w-4 h-4 text-yellow-500 fill-current" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleBookmark(insight.id)
                                }}
                                className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                              >
                                <Bookmark className={`w-4 h-4 ${insight.isBookmarked ? 'fill-current text-yellow-500' : ''}`} />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                <Share className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <span className="text-gray-600">Confidence: {insight.confidence}%</span>
                              <div className="flex items-center gap-1">
                                {getImpactIcon(insight.impact)}
                                <span className={insight.metrics.change > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatChange(insight.metrics.change)}
                                </span>
                              </div>
                            </div>
                            <span className="text-gray-500 text-xs">
                              {new Date(insight.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <AnimatePresence>
                            {selectedInsight === insight.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-gray-200"
                              >
                                <div className="space-y-4">
                                  {/* Metrics */}
                                  <div>
                                    <h5 className="font-medium text-gray-900 mb-2">Key Metrics</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-600">Current:</span>
                                        <p className="font-semibold">{insight.metrics.current}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Previous:</span>
                                        <p className="font-semibold">{insight.metrics.previous}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Change:</span>
                                        <p className={`font-semibold ${insight.metrics.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatChange(insight.metrics.change)}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Benchmark:</span>
                                        <p className="font-semibold">{insight.metrics.benchmark}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Recommendations */}
                                  <div>
                                    <h5 className="font-medium text-gray-900 mb-2">Recommendations</h5>
                                    <ul className="space-y-1">
                                      {insight.recommendations.map((rec, index) => (
                                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                                          <ArrowRight className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                                          {rec}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {/* Actions */}
                                  <div>
                                    <h5 className="font-medium text-gray-900 mb-2">Recommended Actions</h5>
                                    <div className="space-y-2">
                                      {insight.actions.map((action) => (
                                        <div key={action.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                          <div>
                                            <h6 className="font-medium text-gray-900">{action.title}</h6>
                                            <p className="text-sm text-gray-600">{action.description}</p>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs">
                                            <span className={`px-2 py-1 rounded ${
                                              action.effort === 'low' ? 'bg-green-100 text-green-800' :
                                              action.effort === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-red-100 text-red-800'
                                            }`}>
                                              {action.effort} effort
                                            </span>
                                            <span className={`px-2 py-1 rounded ${
                                              action.impact === 'high' ? 'bg-blue-100 text-blue-800' :
                                              action.impact === 'medium' ? 'bg-purple-100 text-purple-800' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {action.impact} impact
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInsights.map((insight) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg p-6 shadow-sm border cursor-pointer hover:shadow-md transition-all ${
                getInsightColor(insight.type)
              } ${!insight.isRead ? 'ring-2 ring-blue-200' : ''}`}
              onClick={() => {
                setSelectedInsight(selectedInsight === insight.id ? null : insight.id)
                if (!insight.isRead) markAsRead(insight.id)
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(insight.priority)}`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleBookmark(insight.id)
                  }}
                  className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <Bookmark className={`w-4 h-4 ${insight.isBookmarked ? 'fill-current text-yellow-500' : ''}`} />
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  {getImpactIcon(insight.impact)}
                  <span className={insight.metrics.change > 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatChange(insight.metrics.change)}
                  </span>
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(insight.createdAt).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Insight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInsights.map((insight) => (
                  <motion.tr
                    key={insight.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`hover:bg-gray-50 ${!insight.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getInsightIcon(insight.type)}
                        <div>
                          <div className="font-medium text-gray-900">{insight.title}</div>
                          <div className="text-sm text-gray-500">{insight.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize text-sm text-gray-900">{insight.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(insight.priority)}`}>
                        {insight.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {getImpactIcon(insight.impact)}
                        <span className={insight.metrics.change > 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatChange(insight.metrics.change)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleBookmark(insight.id)}
                          className="text-gray-400 hover:text-yellow-500 transition-colors"
                        >
                          <Bookmark className={`w-4 h-4 ${insight.isBookmarked ? 'fill-current text-yellow-500' : ''}`} />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <Share className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
