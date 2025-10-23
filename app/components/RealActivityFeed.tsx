'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, Calendar, DollarSign, User, Clock, 
  CheckCircle, AlertCircle, MessageSquare, Bell, Activity,
  TrendingUp, TrendingDown
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'call' | 'appointment' | 'revenue' | 'message' | 'system'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'info'
  value?: string
  trend?: 'up' | 'down' | 'stable'
}

interface RealActivityFeedProps {
  businessId: string
  businessName: string
}

export default function RealActivityFeed({ businessId, businessName }: RealActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRealActivity()
    
    // Refresh every 30 seconds
    const interval = setInterval(loadRealActivity, 30000)
    return () => clearInterval(interval)
  }, [businessId])

  const loadRealActivity = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to view activity')
        return
      }

      // Fetch real activity data
      const response = await fetch(`/api/dashboard/real-activity?businessId=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      } else {
        setError('Failed to load activity')
      }
    } catch (err) {
      setError('Error loading activity')
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string, status: string) => {
    const iconClass = status === 'success' ? 'text-green-400' : 
                     status === 'warning' ? 'text-yellow-400' : 'text-blue-400'
    
    switch (type) {
      case 'call':
        return <Phone className={`w-5 h-5 ${iconClass}`} />
      case 'appointment':
        return <Calendar className={`w-5 h-5 ${iconClass}`} />
      case 'revenue':
        return <DollarSign className={`w-5 h-5 ${iconClass}`} />
      case 'message':
        return <MessageSquare className={`w-5 h-5 ${iconClass}`} />
      default:
        return <Activity className={`w-5 h-5 ${iconClass}`} />
    }
  }

  const getTrendIcon = (trend?: string) => {
    if (!trend) return null
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 bg-gray-500 rounded-full" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-400">Activity Unavailable</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Recent Activity
        </h3>
        <button
          onClick={loadRealActivity}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-gray-500" />
          </div>
          <h4 className="text-lg font-medium text-gray-400 mb-2">No Activity Yet</h4>
          <p className="text-gray-500 text-sm">
            Activity will appear here once you start receiving calls and bookings
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white truncate">
                      {activity.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(activity.trend)}
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {activity.description}
                  </p>
                  {activity.value && (
                    <div className="mt-1">
                      <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded">
                        {activity.value}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
