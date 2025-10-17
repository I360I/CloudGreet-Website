'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  RefreshCw, 
  DollarSign, 
  Zap, 
  Target, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface AIInsight {
  id: string
  type: 'revenue' | 'efficiency' | 'conversion' | 'retention'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  action: string
  estimatedValue?: number
  timeframe?: string
  createdAt: string
}

export default function AdminAIInsights() {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const generateAIInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights || [])
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to generate insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    generateAIInsights()
  }, [])

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'revenue':
        return 'border-green-500 bg-green-500/10'
      case 'efficiency':
        return 'border-blue-500 bg-blue-500/10'
      case 'conversion':
        return 'border-purple-500 bg-purple-500/10'
      case 'retention':
        return 'border-orange-500 bg-orange-500/10'
      default:
        return 'border-gray-500 bg-gray-500/10'
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'revenue':
        return <DollarSign className="w-5 h-5 text-green-400" />
      case 'efficiency':
        return <Zap className="w-5 h-5 text-blue-400" />
      case 'conversion':
        return <Target className="w-5 h-5 text-purple-400" />
      case 'retention':
        return <Users className="w-5 h-5 text-orange-400" />
      default:
        return <Brain className="w-5 h-5 text-gray-400" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-purple-400" />
          <div>
            <h3 className="text-xl font-semibold text-white">AI Insights</h3>
            <p className="text-sm text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={generateAIInsights}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Refresh insights"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No insights available yet</p>
            <button
              onClick={generateAIInsights}
              className="mt-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
            >
              Generate Insights
            </button>
          </div>
        ) : (
          insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border-l-4 ${getInsightColor(insight.type)} bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800 transition-colors`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getInsightIcon(insight.type)}
                  <div>
                    <h4 className="text-lg font-medium text-white mb-1">
                      {insight.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getImpactColor(insight.impact)}`}>
                        {insight.impact} impact
                      </span>
                      <span className="text-xs text-gray-400">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
                {insight.estimatedValue && (
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">
                      +${insight.estimatedValue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">potential</p>
                  </div>
                )}
              </div>

              <p className="text-gray-300 mb-3">{insight.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Action: {insight.action}</span>
                  {insight.timeframe && (
                    <>
                      <span>•</span>
                      <span>{insight.timeframe}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">
                    Implement
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}