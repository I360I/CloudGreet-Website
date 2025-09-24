"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react'

interface AIInsight {
  type: 'prediction' | 'recommendation' | 'alert' | 'opportunity'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  action?: string
  value?: string
}

interface AIInsightsPanelProps {
  businessId: string
}

export default function AIInsightsPanel({ businessId }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAIInsights()
  }, [businessId])

  const fetchAIInsights = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai-intelligence/predictive', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch insights')
      
      const data = await response.json()
      
      // Transform API data into insights
      const transformedInsights: AIInsight[] = []
      
      // Add predictions
      if (data.data?.predictions) {
        transformedInsights.push({
          type: 'prediction',
          title: '30-Day Revenue Forecast',
          description: `Expected revenue: $${data.data.predictions.next30Days.estimatedRevenue.toLocaleString()}`,
          impact: 'high',
          value: `+${Math.round((data.data.predictions.next30Days.estimatedRevenue / 10000) * 100)}%`
        })
      }
      
      // Add recommendations
      if (data.data?.recommendations) {
        data.data.recommendations.forEach((rec: any) => {
          transformedInsights.push({
            type: 'recommendation',
            title: rec.title,
            description: rec.description,
            impact: rec.priority === 'high' ? 'high' : rec.priority === 'medium' ? 'medium' : 'low',
            action: rec.impact
          })
        })
      }
      
      setInsights(transformedInsights)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction': return <TrendingUp className="w-5 h-5" />
      case 'recommendation': return <Target className="w-5 h-5" />
      case 'alert': return <AlertTriangle className="w-5 h-5" />
      case 'opportunity': return <Zap className="w-5 h-5" />
      default: return <Brain className="w-5 h-5" />
    }
  }

  const getInsightColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'from-red-500 to-orange-500'
      case 'medium': return 'from-blue-500 to-purple-500'
      case 'low': return 'from-green-500 to-emerald-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-semibold text-white">AI Insights</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-red-500/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <h3 className="text-xl font-semibold text-white">AI Insights</h3>
        </div>
        <p className="text-red-400">{error}</p>
        <button 
          onClick={fetchAIInsights}
          className="mt-3 text-sm text-purple-400 hover:text-purple-300"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-semibold text-white">AI Insights</h3>
        </div>
        <button 
          onClick={fetchAIInsights}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No insights available yet</p>
            <p className="text-sm text-gray-500">AI will analyze your data and provide insights</p>
          </div>
        ) : (
          insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${getInsightColor(insight.impact)}/10 rounded-xl blur-sm group-hover:blur-md transition-all duration-300`} />
              <div className="relative bg-gray-700/30 backdrop-blur-sm p-4 rounded-xl border border-gray-600/30 group-hover:border-gray-500/50 transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${getInsightColor(insight.impact)}/20 text-white`}>
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white truncate">{insight.title}</h4>
                      {insight.value && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                          {insight.value}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{insight.description}</p>
                    {insight.action && (
                      <p className="text-xs text-gray-400">{insight.action}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>Updated {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  )
}
