'use client'

import React, { useState, useEffect, memo, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, Calendar, DollarSign, User, Clock, 
  CheckCircle, AlertCircle, MessageSquare, Bell, Activity,
  TrendingUp, TrendingDown
} from 'lucide-react'
import { useRealtimeMetrics } from '../../hooks/useDashboardData'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { getServiceColor } from '@/lib/business-theme'
import type { RealtimeData } from '@/lib/types/realtime-data'

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
  businessId?: string
  businessName?: string
}

const RealActivityFeed = memo(function RealActivityFeed({ businessId, businessName }: RealActivityFeedProps) {
  const { theme, business } = useBusinessData()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const { data: realtimeData, isLoading, error } = useRealtimeMetrics(businessId)

  const primaryColor = theme?.primaryColor || '#8b5cf6'
  // Use default colors for call/appointment types
  const callColor = '#3b82f6'
  const appointmentColor = '#8b5cf6'

  const processedActivities = useMemo(() => {
    if (!realtimeData) return []
    
    // Process real-time data into activity items
    const newActivities: ActivityItem[] = []
    const data = realtimeData as RealtimeData
    
    // Process calls
    if (data.calls) {
      data.calls.forEach((call) => {
        newActivities.push({
          id: `call-${call.id}`,
          type: 'call',
          title: `New call from ${call.from_number}`,
          description: `Call ${call.status} - ${call.duration || 0}s`,
          timestamp: call.created_at,
          status: call.status === 'completed' ? 'success' : 'warning',
          value: call.duration ? `${call.duration}s` : undefined
        })
      })
    }
    
    // Process appointments
    if (data.appointments) {
      data.appointments.forEach((apt) => {
        newActivities.push({
          id: `apt-${apt.id}`,
          type: 'appointment',
          title: `Appointment scheduled`,
          description: `${apt.customer_name} - ${apt.service_type}`,
          timestamp: apt.created_at,
          status: 'success',
          value: apt.estimated_value ? `$${apt.estimated_value}` : undefined
        })
      })
    }
    
    // Process SMS
    if (data.sms) {
      data.sms.forEach((sms) => {
        newActivities.push({
          id: `sms-${sms.id}`,
          type: 'message',
          title: `SMS ${sms.direction}`,
          description: `To/From: ${sms.to_number || sms.from_number}`,
          timestamp: sms.created_at,
          status: sms.status === 'sent' ? 'success' : 'warning'
        })
      })
    }
    
    // Return last 20 activities, sorted by timestamp (newest first)
    return newActivities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
  }, [realtimeData])

  useEffect(() => {
    setActivities(processedActivities)
  }, [processedActivities])

  // Use real-time data from hook
  const loading = isLoading
  const errorMessage = error

  const getActivityIcon = (type: string, status: string) => {
    const getColor = () => {
      if (status === 'success') {
        switch (type) {
          case 'call': return callColor
          case 'appointment': return appointmentColor
          default: return '#10b981'
        }
      } else if (status === 'warning') {
        return '#f59e0b'
      } else {
        return primaryColor
      }
    }
    
    const iconColor = getColor()
    
    switch (type) {
      case 'call':
        return <Phone className="w-5 h-5" style={{ color: iconColor }} />
      case 'appointment':
        return <Calendar className="w-5 h-5" style={{ color: iconColor }} />
      case 'revenue':
        return <DollarSign className="w-5 h-5" style={{ color: iconColor }} />
      case 'message':
        return <MessageSquare className="w-5 h-5" style={{ color: iconColor }} />
      default:
        return <Activity className="w-5 h-5" style={{ color: iconColor }} />
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
        return <div className="w-4 h-4 bg-slate-500 rounded-full" />
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
          <Activity className="w-5 h-5" style={{ color: primaryColor }} />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-white/10 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded-lg w-3/4 mb-2"></div>
                <div className="h-3 bg-white/10 rounded-lg w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    )
  }

  if (errorMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-xl p-6 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-1">Activity Unavailable</h3>
            <p className="text-red-300/80 text-sm">{errorMessage}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <Activity className="w-5 h-5" style={{ color: primaryColor }} />
          Recent Activity
        </h3>
        <div className="flex items-center gap-2 text-sm" style={{ color: primaryColor }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></div>
          Live Updates
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-slate-400" />
          </div>
          <h4 className="text-lg font-medium text-slate-300 mb-2">No Activity Yet</h4>
          <p className="text-slate-400 text-sm">
            Activity will appear here once you start receiving calls and bookings
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {activities && activities.length > 0 ? activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ 
                  delay: index * 0.05,
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={{ scale: 1.02, x: 4 }}
                className="flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer"
                style={{ 
                  backgroundColor: 'transparent',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
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
                      <span className="text-xs bg-white/10 text-slate-300 px-2 py-1 rounded-lg">
                        {activity.value}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm">No activities to display</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
})

RealActivityFeed.displayName = 'RealActivityFeed'

export default RealActivityFeed
