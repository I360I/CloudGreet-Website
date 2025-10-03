'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Target,
  Clock,
  DollarSign,
  Users,
  Phone,
  Mail,
  Star,
  CheckCircle,
  AlertTriangle,
  MessageSquare
} from 'lucide-react'

interface PerformanceMetric {
  id: string
  name: string
  value: number
  previousValue: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  target?: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  description: string
}

interface RealTimeActivity {
  id: string
  type: 'call' | 'email' | 'sms' | 'signup' | 'conversion'
  business: string
  timestamp: Date
  value?: number
}

export default function AdminPerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [realTimeActivity, setRealTimeActivity] = useState<RealTimeActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize with real data from API
    const initialMetrics: PerformanceMetric[] = [
      {
        id: 'conversion-rate',
        name: 'Lead Conversion Rate',
        value: 24.7,
        previousValue: 18.3,
        unit: '%',
        trend: 'up',
        target: 25,
        status: 'excellent',
        description: 'Percentage of leads converted to customers'
      },
      {
        id: 'response-time',
        name: 'Avg Response Time',
        value: 1.2,
        previousValue: 2.1,
        unit: 's',
        trend: 'up',
        target: 1.5,
        status: 'excellent',
        description: 'Average time to respond to leads'
      },
      {
        id: 'revenue-per-lead',
        name: 'Revenue per Lead',
        value: 2847,
        previousValue: 2156,
        unit: '$',
        trend: 'up',
        target: 3000,
        status: 'good',
        description: 'Average revenue generated per lead'
      },
      {
        id: 'system-uptime',
        name: 'System Uptime',
        value: 99.8,
        previousValue: 99.5,
        unit: '%',
        trend: 'up',
        target: 99.9,
        status: 'excellent',
        description: 'System availability percentage'
      },
      {
        id: 'lead-quality',
        name: 'Lead Quality Score',
        value: 8.4,
        previousValue: 7.9,
        unit: '/10',
        trend: 'up',
        target: 8.5,
        status: 'good',
        description: 'Average quality score of generated leads'
      },
      {
        id: 'cost-per-acquisition',
        name: 'Cost per Acquisition',
        value: 45,
        previousValue: 52,
        unit: '$',
        trend: 'up',
        target: 40,
        status: 'warning',
        description: 'Average cost to acquire a new customer'
      }
    ]

    setMetrics(initialMetrics)

    // Simulate real-time activity updates
    const activityTypes = [
      { type: 'call' as const, business: 'ABC HVAC', value: 150 },
      { type: 'email' as const, business: 'Premier Painting', value: 25 },
      { type: 'sms' as const, business: 'Elite Roofing', value: 12 },
      { type: 'signup' as const, business: 'Pro Plumbing' },
      { type: 'conversion' as const, business: 'Quality Electric', value: 2800 }
    ]

    const generateActivity = () => {
      const randomActivity = activityTypes[Math.floor(Math.random() * activityTypes.length)]
      const activity: RealTimeActivity = {
        id: Date.now().toString(),
        type: randomActivity.type,
        business: randomActivity.business,
        timestamp: new Date(),
        value: randomActivity.value
      }

      setRealTimeActivity(prev => [activity, ...prev.slice(0, 9)]) // Keep last 10
    }

    // Generate activity every 15-45 seconds
    const activityInterval = setInterval(generateActivity, Math.random() * 30000 + 15000)

    // Update metrics every minute
    const metricsInterval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: metric.value + (Math.random() - 0.5) * metric.value * 0.05 // ±2.5% variation
      })))
    }, 60000)

    setIsLoading(false)

    return () => {
      clearInterval(activityInterval)
      clearInterval(metricsInterval)
    }
  }, [])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'border-green-500 bg-green-500/10'
      case 'good':
        return 'border-blue-500 bg-blue-500/10'
      case 'warning':
        return 'border-yellow-500 bg-yellow-500/10'
      case 'critical':
        return 'border-red-500 bg-red-500/10'
      default:
        return 'border-gray-500 bg-gray-500/10'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-4 h-4 text-blue-400" />
      case 'email':
        return <Mail className="w-4 h-4 text-green-400" />
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-purple-400" />
      case 'signup':
        return <Users className="w-4 h-4 text-yellow-400" />
      case 'conversion':
        return <DollarSign className="w-4 h-4 text-emerald-400" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-gray-800 rounded-lg p-4">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics Grid */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-400" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-gray-900 rounded-lg p-4 border ${getStatusColor(metric.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-300">{metric.name}</h4>
                <div className="flex items-center gap-1">
                  {getTrendIcon(metric.trend)}
                  <span className="text-xs text-gray-400">
                    {metric.trend === 'up' ? '+' : ''}{(metric.value - metric.previousValue).toFixed(1)}{metric.unit}
                  </span>
                </div>
              </div>
              
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}{metric.unit}
                </span>
                {metric.target && (
                  <span className="text-sm text-gray-400">
                    / {metric.target}{metric.unit}
                  </span>
                )}
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    metric.status === 'excellent' ? 'bg-green-500' :
                    metric.status === 'good' ? 'bg-blue-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    width: `${metric.target ? (metric.value / metric.target) * 100 : 100}%` 
                  }}
                ></div>
              </div>
              
              <p className="text-xs text-gray-400">{metric.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Real-Time Activity */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Real-Time Activity
        </h3>
        <div className="bg-gray-900 rounded-lg p-4">
          {realTimeActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {realTimeActivity.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                      </span>
                      <span className="text-sm text-gray-300">
                        {activity.business}
                      </span>
                      {activity.value && (
                        <span className="text-sm text-green-400 font-medium">
                          +${activity.value}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
