'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Star, TrendingUp, AlertTriangle, CheckCircle, 
  Clock, Volume2, MessageSquare, Phone, X
} from 'lucide-react'

interface CallQualityData {
  callId: string
  duration: number
  qualityScore: number
  sentimentScore: number
  keywords: string[]
  issues: string[]
  recommendations: string[]
  transcript: string
  recordingUrl?: string
}

interface CallQualityMetricsProps {
  businessId: string
}

export default function CallQualityMetrics({ businessId }: CallQualityMetricsProps) {
  const [qualityData, setQualityData] = useState<CallQualityData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<CallQualityData | null>(null)

  useEffect(() => {
    loadQualityData()
  }, [businessId])

  const loadQualityData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/calls/quality-metrics?businessId=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQualityData(data.qualityData || [])
      }
    } catch (error) {
      console.error('Error loading quality data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getQualityBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20'
    if (score >= 60) return 'bg-yellow-500/20'
    return 'bg-red-500/20'
  }

  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return 'text-green-400'
    if (score >= 0.3) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Star className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Analyzing Call Quality...</h3>
            <p className="text-sm text-gray-400">Processing recent calls</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700/50 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-700/50 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-700/50 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    )
  }

  if (qualityData.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Star className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Call Quality Metrics</h3>
            <p className="text-sm text-gray-400">AI-powered call analysis</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No calls analyzed yet</div>
          <div className="text-sm text-gray-500">Quality metrics will appear after calls are made</div>
        </div>
      </div>
    )
  }

  const averageQuality = qualityData.reduce((sum, call) => sum + call.qualityScore, 0) / qualityData.length
  const averageSentiment = qualityData.reduce((sum, call) => sum + call.sentimentScore, 0) / qualityData.length

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
          <Star className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Call Quality Metrics</h3>
          <p className="text-sm text-gray-400">AI-powered call analysis</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Overall Quality Score */}
        <div className={`${getQualityBg(averageQuality)} border border-gray-600/50 rounded-xl p-6`}>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              <span className={getQualityColor(averageQuality)}>
                {averageQuality.toFixed(0)}%
              </span>
            </div>
            <div className="text-lg text-gray-300 mb-2">Average Quality Score</div>
            <div className="text-sm text-gray-400">
              Based on {qualityData.length} recent calls
            </div>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="font-medium">Customer Sentiment</span>
            </div>
            <div className={`text-2xl font-bold ${getSentimentColor(averageSentiment)}`}>
              {averageSentiment > 0.7 ? 'Positive' : averageSentiment > 0.3 ? 'Neutral' : 'Negative'}
            </div>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${averageSentiment * 100}%` }}
            />
          </div>
        </div>

        {/* Recent Calls */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-300">Recent Call Analysis</div>
          {qualityData.slice(0, 5).map((call, index) => (
            <div 
              key={call.callId}
              className="bg-gray-700/30 rounded-lg p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
              onClick={() => setSelectedCall(call)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Phone className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">Call #{index + 1}</div>
                    <div className="text-sm text-gray-400">
                      {Math.floor(call.duration / 60)}m {call.duration % 60}s
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getQualityColor(call.qualityScore)}`}>
                      {call.qualityScore}%
                    </div>
                    <div className="text-xs text-gray-400">Quality</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getSentimentColor(call.sentimentScore)}`}>
                      {call.sentimentScore > 0.7 ? '😊' : call.sentimentScore > 0.3 ? '😐' : '😞'}
                    </div>
                    <div className="text-xs text-gray-400">Sentiment</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call Details Modal */}
        {selectedCall && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Call Quality Analysis</h3>
                  <button
                    onClick={() => setSelectedCall(null)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quality Score */}
                  <div className={`${getQualityBg(selectedCall.qualityScore)} border border-gray-600/50 rounded-lg p-4`}>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getQualityColor(selectedCall.qualityScore)}`}>
                        {selectedCall.qualityScore}%
                      </div>
                      <div className="text-sm text-gray-300">Quality Score</div>
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getSentimentColor(selectedCall.sentimentScore)}`}>
                        {selectedCall.sentimentScore > 0.7 ? '😊' : selectedCall.sentimentScore > 0.3 ? '😐' : '😞'}
                      </div>
                      <div className="text-sm text-gray-300">Customer Sentiment</div>
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                {selectedCall.keywords.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-300 mb-3">Key Topics Discussed</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCall.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues */}
                {selectedCall.issues.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Issues Identified
                    </h4>
                    <ul className="space-y-2">
                      {selectedCall.issues.map((issue, index) => (
                        <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {selectedCall.recommendations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-green-400 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {selectedCall.recommendations.map((recommendation, index) => (
                        <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Transcript */}
                {selectedCall.transcript && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-300 mb-3">Call Transcript</h4>
                    <div className="bg-gray-700/30 rounded-lg p-4 max-h-40 overflow-y-auto">
                      <div className="text-sm text-gray-300 whitespace-pre-wrap">
                        {selectedCall.transcript}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
