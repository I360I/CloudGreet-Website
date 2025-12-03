'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb, TrendingUp, Clock, DollarSign, Target, AlertTriangle, CheckCircle, Star, Zap, Users, Calendar, Phone } from 'lucide-react'
import { Card } from './ui/Card'
import { logger } from '@/lib/monitoring'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

interface AIInsight {
  id: string
  type: 'optimization' | 'opportunity' | 'warning' | 'success'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string,
  action: string
  metrics?: {
    current: number
    potential: number
    unit: string
  }
  category: 'conversion' | 'timing' | 'revenue' | 'quality' | 'efficiency'
}

interface AIInsightsProps {
  businessId: string
  className?: string
}

export default function AIInsights({ businessId, className = '' }: AIInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadInsights()
  }, [businessId])

  const loadInsights = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth(`/api/analytics/ai-insights?businessId=${businessId}`)
      
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights)
      }
    } catch (error) {
      logger.error('Error loading insights', { error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="w-5 h-5" />
      case 'opportunity': return <DollarSign className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'success': return <CheckCircle className="w-5 h-5" />
  default: return <Lightbulb className="w-5 h-5" />
    }
  }

  const getInsightColor = (type: string, priority: string) => {
    if (priority === 'high') {
      switch (type) {
        case 'warning': return 'text-red-400 bg-red-500/20 border-red-500/30'
        case 'opportunity': return 'text-green-400 bg-green-500/20 border-green-500/30'
        case 'optimization': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
        case 'success': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
  default: return 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      }
    } else if (priority === 'medium') {
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
    } else {
      return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'conversion': return <Target className="w-4 h-4" />
      case 'timing': return <Clock className="w-4 h-4" />
      case 'revenue': return <DollarSign className="w-4 h-4" />
      case 'quality': return <Star className="w-4 h-4" />
      case 'efficiency': return <Zap className="w-4 h-4" />
  default: return <Lightbulb className="w-4 h-4" />
    }
  }

  const categories = [
    { id: 'all', label: 'All', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'conversion', label: 'Conversion', icon: <Target className="w-4 h-4" /> },
    { id: 'timing', label: 'Timing', icon: <Clock className="w-4 h-4" /> },
    { id: 'revenue', label: 'Revenue', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'quality', label: 'Quality', icon: <Star className="w-4 h-4" /> },
    { id: 'efficiency', label: 'Efficiency', icon: <Zap className="w-4 h-4" /> }
  ]

  const filteredInsights = selectedCategory === 'all' 
    ? insights 
    : insights.filter(insight => insight.category === selectedCategory)

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700/50 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-semibold text-white mb-2">No Insights Yet</h3>
        <p className="text-gray-400 mb-4">Start receiving calls to get AI-powered insights and recommendations</p>
        <button 
          onClick={loadInsights}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Refresh Insights
        </button>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-yellow-400" />
          AI Insights & Recommendations
        </h2>
        
        <button 
          onClick={loadInsights}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {category.icon}
            {category.label}
          </button>
        ))}
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredInsights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-6 border-l-4 ${getInsightColor(insight.type, insight.priority)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getInsightIcon(insight.type)}
                  <div>
                    <h3 className="text-lg font-semibold text-white">{insight.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                        insight.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        insight.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {insight.priority}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        {getCategoryIcon(insight.category)}
                        <span className="capitalize">{insight.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {insight.metrics && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {insight.metrics.current} → {insight.metrics.potential}
                    </div>
                    <div className="text-xs text-gray-400">{insight.metrics.unit}</div>
                  </div>
                )}
              </div>

              <p className="text-gray-300 mb-4">{insight.description}</p>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-400">Impact:</span>
                  <p className="text-sm text-gray-300">{insight.impact}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-400">Recommended Action:</span>
                  <p className="text-sm text-gray-300">{insight.action}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                  Implement
                </button>
                <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                  Learn More
                </button>
                <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                  Dismiss
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Insights Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{insights.length}</div>
            <div className="text-sm text-gray-400">Total Insights</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {insights.filter(i => i.priority === 'high').length}
            </div>
            <div className="text-sm text-gray-400">High Priority</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {insights.filter(i => i.type === 'opportunity').length}
            </div>
            <div className="text-sm text-gray-400">Opportunities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {insights.filter(i => i.type === 'optimization').length}
            </div>
            <div className="text-sm text-gray-400">Optimizations</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
