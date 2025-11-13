'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Phone, Clock, Volume2, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { Card } from './ui/Card'
import { logger } from '@/lib/monitoring'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

interface QualityMetrics {
  avgCallDuration: number,
  avgResponseTime: number,
  audioQuality: number,
  dropRate: number,
  customerSatisfaction: number
}

interface CallQualityMetricsProps {
  businessId: string
  className?: string
}

export default function CallQualityMetrics({ businessId, className = '' }: CallQualityMetricsProps) {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQualityMetrics()
  }, [businessId])

  const loadQualityMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth(`/api/calls/quality-metrics?businessId=${businessId}`)
      
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.quality)
      } else {
        logger.error('Failed to load quality metrics', { businessId, status: response.status })
      }
    } catch (error) {
      console.error('Error loading quality metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getQualityColor = (value: number, type: 'duration' | 'response' | 'audio' | 'drop' | 'satisfaction') => {
    switch (type) {
      case 'duration':
        return value > 180 ? 'text-green-400' : value > 60 ? 'text-yellow-400' : 'text-red-400'
      case 'response':
        return value < 2 ? 'text-green-400' : value < 5 ? 'text-yellow-400' : 'text-red-400'
      case 'audio':
        return value > 90 ? 'text-green-400' : value > 70 ? 'text-yellow-400' : 'text-red-400'
      case 'drop':
        return value < 5 ? 'text-green-400' : value < 15 ? 'text-yellow-400' : 'text-red-400'
      case 'satisfaction':
        return value > 80 ? 'text-green-400' : value > 60 ? 'text-yellow-400' : 'text-red-400'
  default:
        return 'text-gray-400'
    }
  }

  const getQualityIcon = (value: number, type: 'duration' | 'response' | 'audio' | 'drop' | 'satisfaction') => {
    switch (type) {
      case 'duration':
        return value > 180 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />
      case 'response':
        return value < 2 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />
      case 'audio':
        return value > 90 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />
      case 'drop':
        return value < 5 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />
      case 'satisfaction':
        return value > 80 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />
  default:
        return <TrendingUp className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <Phone className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-semibold text-white mb-2">No Quality Data</h3>
        <p className="text-gray-400 mb-4">Start receiving calls to see quality metrics</p>
        <button 
          onClick={loadQualityMetrics}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Refresh Data
        </button>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Phone className="w-5 h-5 text-blue-400" />
        Call Quality Metrics
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Average Call Duration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Avg Duration</span>
            </div>
            {getQualityIcon(metrics.avgCallDuration, 'duration')}
          </div>
          <div className={`text-2xl font-bold ${getQualityColor(metrics.avgCallDuration, 'duration')}`}>
            {Math.round(metrics.avgCallDuration)}s
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {metrics.avgCallDuration > 180 ? 'Excellent' : 
             metrics.avgCallDuration > 60 ? 'Good' : 'Needs improvement'}
          </div>
        </motion.div>

        {/* Average Response Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-gray-300">Response Time</span>
            </div>
            {getQualityIcon(metrics.avgResponseTime, 'response')}
          </div>
          <div className={`text-2xl font-bold ${getQualityColor(metrics.avgResponseTime, 'response')}`}>
            {metrics.avgResponseTime}s
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {metrics.avgResponseTime < 2 ? 'Excellent' : 
             metrics.avgResponseTime < 5 ? 'Good' : 'Needs improvement'}
          </div>
        </motion.div>

        {/* Audio Quality */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Audio Quality</span>
            </div>
            {getQualityIcon(metrics.audioQuality, 'audio')}
          </div>
          <div className={`text-2xl font-bold ${getQualityColor(metrics.audioQuality, 'audio')}`}>
            {metrics.audioQuality}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {metrics.audioQuality > 90 ? 'Excellent' : 
             metrics.audioQuality > 70 ? 'Good' : 'Needs improvement'}
          </div>
        </motion.div>

        {/* Drop Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/50 rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-gray-300">Drop Rate</span>
            </div>
            {getQualityIcon(metrics.dropRate, 'drop')}
          </div>
          <div className={`text-2xl font-bold ${getQualityColor(metrics.dropRate, 'drop')}`}>
            {metrics.dropRate}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {metrics.dropRate < 5 ? 'Excellent' : 
             metrics.dropRate < 15 ? 'Good' : 'Needs improvement'}
          </div>
        </motion.div>
      </div>

      {/* Customer Satisfaction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 bg-gray-800/50 rounded-lg p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-gray-300">Customer Satisfaction</span>
          </div>
          {getQualityIcon(metrics.customerSatisfaction, 'satisfaction')}
        </div>
        <div className={`text-2xl font-bold ${getQualityColor(metrics.customerSatisfaction, 'satisfaction')}`}>
          {metrics.customerSatisfaction}%
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {metrics.customerSatisfaction > 80 ? 'Excellent' : 
           metrics.customerSatisfaction > 60 ? 'Good' : 'Needs improvement'}
        </div>
      </motion.div>
    </Card>
  )
}
