'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, TrendingUp, TrendingDown, Users, MessageSquare, 
  AlertTriangle, CheckCircle, Clock, Target, Zap,
  BarChart3, PieChart, Activity, Eye, Star
} from 'lucide-react'

interface ConversationInsights {
  overview: {
    totalConversations: number
    avgSentimentScore: number
    avgLeadScore: number
    conversionRate: number
    avgResponseTime: number
    timeframe: string
  }
  distributions: {
    sentiment: Record<string, number>
    intent: Record<string, number>
    urgency: Record<string, number>
    emotionalState: Record<string, number>
    peakHours: Record<number, number>
  }
  insights: Array<{
    type: 'positive' | 'warning' | 'success' | 'opportunity' | 'urgent'
    title: string
    description: string
    impact: 'low' | 'medium' | 'high' | 'critical'
  }>
  metrics: {
    highValueLeads: number
    newCustomers: number
    returningCustomers: number
    peakHour: string
    bookingIntents: number
    totalCustomers: number
  }
  trends: {
    conversationGrowth: string
    sentimentTrend: string
    conversionTrend: string
  }
}

interface AIConversationInsightsProps {
  businessId: string
}

export default function AIConversationInsights({ businessId }: AIConversationInsightsProps) {
  const [insights, setInsights] = useState<ConversationInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('overview')

  useEffect(() => {
    loadInsights()
  }, [timeframe])

  const loadInsights = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/ai/conversation-insights?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setInsights(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to load conversation insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'success': return <TrendingUp className="w-5 h-5 text-blue-400" />
      case 'opportunity': return <Target className="w-5 h-5 text-purple-400" />
      case 'urgent': return <Zap className="w-5 h-5 text-red-400" />
      default: return <Eye className="w-5 h-5 text-gray-400" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'border-green-500/30 bg-green-500/10'
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/10'
      case 'success': return 'border-blue-500/30 bg-blue-500/10'
      case 'opportunity': return 'border-purple-500/30 bg-purple-500/10'
      case 'urgent': return 'border-red-500/30 bg-red-500/10'
      default: return 'border-gray-500/30 bg-gray-500/10'
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400'
      case 'negative': return 'text-red-400'
      case 'neutral': return 'text-gray-400'
      case 'frustrated': return 'text-yellow-400'
      case 'urgent': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mr-3" />
          <span className="text-gray-300">Loading AI insights...</span>
        </div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Conversation Data</h3>
          <p className="text-gray-400">Start having conversations to see AI insights</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Conversation Intelligence</h2>
              <p className="text-sm text-gray-400">Advanced insights from your AI receptionist</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {['24h', '7d', '30d', '90d'].map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  timeframe === period
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <MessageSquare className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{insights.overview.totalConversations}</div>
            <div className="text-sm text-gray-400">Conversations</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{formatPercentage(insights.overview.conversionRate)}</div>
            <div className="text-sm text-gray-400">Conversion Rate</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{Math.round(insights.overview.avgLeadScore)}</div>
            <div className="text-sm text-gray-400">Avg Lead Score</div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{insights.overview.avgResponseTime}s</div>
            <div className="text-sm text-gray-400">Response Time</div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {insights.insights.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
            AI Insights & Recommendations
          </h3>
          
          <div className="space-y-3">
            {insights.insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start space-x-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-300">{insight.description}</p>
                    <div className="flex items-center mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        insight.impact === 'critical' ? 'bg-red-500/20 text-red-400' :
                        insight.impact === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        insight.impact === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {insight.impact} impact
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Distributions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-green-400" />
            Customer Sentiment
          </h3>
          
          <div className="space-y-3">
            {Object.entries(insights.distributions.sentiment).map(([sentiment, count]) => (
              <div key={sentiment} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    sentiment === 'positive' ? 'bg-green-400' :
                    sentiment === 'negative' ? 'bg-red-400' :
                    sentiment === 'neutral' ? 'bg-gray-400' :
                    'bg-yellow-400'
                  }`} />
                  <span className={`capitalize font-medium ${getSentimentColor(sentiment)}`}>
                    {sentiment}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        sentiment === 'positive' ? 'bg-green-400' :
                        sentiment === 'negative' ? 'bg-red-400' :
                        sentiment === 'neutral' ? 'bg-gray-400' :
                        'bg-yellow-400'
                      }`}
                      style={{ width: `${(count / insights.overview.totalConversations) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-300 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Intent Distribution */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-400" />
            Conversation Intent
          </h3>
          
          <div className="space-y-3">
            {Object.entries(insights.distributions.intent).map(([intent, count]) => (
              <div key={intent} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <span className="capitalize font-medium text-white">{intent}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-400"
                      style={{ width: `${(count / insights.overview.totalConversations) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-300 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Metrics */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
          Advanced Metrics
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">{insights.metrics.highValueLeads}</div>
            <div className="text-sm text-gray-400">High-Value Leads</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{insights.metrics.bookingIntents}</div>
            <div className="text-sm text-gray-400">Booking Intentions</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{insights.metrics.peakHour}</div>
            <div className="text-sm text-gray-400">Peak Hour</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-white">{insights.metrics.totalCustomers}</div>
            <div className="text-sm text-gray-400">Total Customers</div>
          </div>
        </div>
      </div>
    </div>
  )
}
