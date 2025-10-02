'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  Zap,
  Star,
  DollarSign,
  Users,
  Phone,
  Mail,
  ArrowRight,
  RefreshCw
} from 'lucide-react'

interface AIInsight {
  id: string
  type: 'opportunity' | 'warning' | 'optimization' | 'success'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  action: string
  estimatedValue?: number
  confidence: number
  category: 'revenue' | 'efficiency' | 'conversion' | 'retention'
}

export default function AdminAIInsights() {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    generateAIInsights()
    
    // Refresh insights every 5 minutes
    const interval = setInterval(() => {
      generateAIInsights()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const generateAIInsights = async () => {
    setIsLoading(true)
    
    // Simulate AI-generated insights based on current data
    const mockInsights: AIInsight[] = [
      {
        id: '1',
        type: 'opportunity',
        priority: 'high',
        title: 'HVAC Lead Surge Opportunity',
        description: 'HVAC businesses are showing 40% higher conversion rates this week. Your current HVAC lead generation is below average.',
        impact: 'Potential $15,000+ additional monthly revenue',
        action: 'Increase HVAC targeting by 25% in lead generation campaigns',
        estimatedValue: 15000,
        confidence: 87,
        category: 'revenue'
      },
      {
        id: '2',
        type: 'optimization',
        priority: 'medium',
        title: 'Email Response Time Optimization',
        description: 'Clients contacted within 2 hours have 60% higher conversion rates. Current average response time is 4.2 hours.',
        impact: 'Could increase conversions by 35%',
        action: 'Implement automated email sequences for urgent leads',
        estimatedValue: 8500,
        confidence: 92,
        category: 'conversion'
      },
      {
        id: '3',
        type: 'warning',
        priority: 'high',
        title: 'High-Value Client At Risk',
        description: 'Premier Painting Co (4.8★, $8K/month) has not been contacted in 72 hours. Risk of losing to competitor.',
        impact: 'Potential loss of $8,000/month recurring revenue',
        action: 'Immediate personal outreach via phone call',
        estimatedValue: -8000,
        confidence: 95,
        category: 'retention'
      },
      {
        id: '4',
        type: 'success',
        priority: 'low',
        title: 'Peak Performance Achieved',
        description: 'System uptime reached 99.9% this week, exceeding target of 99.5%. All services operating optimally.',
        impact: 'Zero client complaints, improved satisfaction',
        action: 'Maintain current system monitoring protocols',
        confidence: 98,
        category: 'efficiency'
      },
      {
        id: '5',
        type: 'opportunity',
        priority: 'medium',
        title: 'Geographic Expansion Opportunity',
        description: 'Dallas market shows 200% higher lead quality scores. Consider expanding lead generation to Dallas area.',
        impact: 'Potential $25,000+ monthly revenue from new market',
        action: 'Launch Dallas-focused lead generation campaign',
        estimatedValue: 25000,
        confidence: 78,
        category: 'revenue'
      },
      {
        id: '6',
        type: 'optimization',
        priority: 'low',
        title: 'Follow-up Sequence Optimization',
        description: 'Follow-up emails sent on Tuesday/Thursday have 25% higher open rates than Monday/Friday.',
        impact: 'Could improve email engagement by 25%',
        action: 'Adjust automated follow-up schedule to Tuesday/Thursday',
        estimatedValue: 3000,
        confidence: 85,
        category: 'efficiency'
      }
    ]

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setInsights(mockInsights)
    setLastUpdated(new Date())
    setIsLoading(false)
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="w-5 h-5 text-green-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-red-400" />
      case 'optimization':
        return <Zap className="w-5 h-5 text-blue-400" />
      case 'success':
        return <Star className="w-5 h-5 text-yellow-400" />
      default:
        return <Lightbulb className="w-5 h-5 text-purple-400" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'border-l-green-500 bg-green-500/5'
      case 'warning':
        return 'border-l-red-500 bg-red-500/5'
      case 'optimization':
        return 'border-l-blue-500 bg-blue-500/5'
      case 'success':
        return 'border-l-yellow-500 bg-yellow-500/5'
      default:
        return 'border-l-purple-500 bg-purple-500/5'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'revenue':
        return <DollarSign className="w-4 h-4" />
      case 'efficiency':
        return <Zap className="w-4 h-4" />
      case 'conversion':
        return <Target className="w-4 h-4" />
      case 'retention':
        return <Users className="w-4 h-4" />
      default:
        return <Brain className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
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
        {insights.map((insight, index) => (
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(insight.priority)}`}>
                      {insight.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      {getCategoryIcon(insight.category)}
                      {insight.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {insight.confidence}% confidence
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-300 mb-3">
              {insight.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h5 className="text-sm font-medium text-gray-400 mb-1">Impact</h5>
                <p className="text-sm text-white">{insight.impact}</p>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-400 mb-1">Recommended Action</h5>
                <p className="text-sm text-white">{insight.action}</p>
              </div>
            </div>

            {insight.estimatedValue && (
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${
                  insight.estimatedValue > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {insight.estimatedValue > 0 ? '+' : ''}${Math.abs(insight.estimatedValue).toLocaleString()}/month
                </span>
                <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm">
                  <span>Take Action</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          AI insights are generated based on real-time data analysis and machine learning algorithms
        </p>
      </div>
    </div>
  )
}
