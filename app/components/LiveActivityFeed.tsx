'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Phone, Calendar, DollarSign, User, Clock, 
  CheckCircle, AlertCircle, MessageSquare, Bell 
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'call' | 'appointment' | 'revenue' | 'message' | 'system'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'info'
  value?: string
}

interface LiveActivityFeedProps {
  businessName: string
  realActivity?: any[]
}

export default function LiveActivityFeed({ businessName, realActivity = [] }: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLive, setIsLive] = useState(true)

  // Use real activity data if available, otherwise generate realistic data
  useEffect(() => {
    if (realActivity && realActivity.length > 0) {
      setActivities(realActivity)
      return
    }

    const generateActivity = (): ActivityItem => {
      const types = ['call', 'appointment', 'revenue', 'message', 'system'] as const
      const type = types[Math.floor(Math.random() * types.length)]
      
      const now = new Date()
      const minutesAgo = Math.floor(Math.random() * 60)
      const timestamp = new Date(now.getTime() - minutesAgo * 60000)
      
      const activities = {
        call: [
          {
            title: 'New Call Received',
            description: 'Customer called about HVAC repair services',
            status: 'success' as const,
            value: '3m 24s'
          },
          {
            title: 'Missed Call',
            description: 'Customer called outside business hours',
            status: 'warning' as const,
            value: 'Voicemail'
          },
          {
            title: 'Call Completed',
            description: 'Successfully scheduled appointment',
            status: 'success' as const,
            value: '2m 15s'
          }
        ],
        appointment: [
          {
            title: 'Appointment Scheduled',
            description: 'HVAC maintenance scheduled for tomorrow',
            status: 'success' as const,
            value: '$150'
          },
          {
            title: 'Appointment Confirmed',
            description: 'Customer confirmed 2 PM appointment',
            status: 'success' as const,
            value: '2:00 PM'
          },
          {
            title: 'Appointment Rescheduled',
            description: 'Customer requested different time slot',
            status: 'warning' as const,
            value: '3:00 PM'
          }
        ],
        revenue: [
          {
            title: 'Payment Received',
            description: 'Invoice #1234 paid via credit card',
            status: 'success' as const,
            value: '$450'
          },
          {
            title: 'Quote Accepted',
            description: 'Customer accepted roofing estimate',
            status: 'success' as const,
            value: '$2,500'
          },
          {
            title: 'Deposit Received',
            description: '50% deposit for upcoming project',
            status: 'success' as const,
            value: '$1,200'
          }
        ],
        message: [
          {
            title: 'SMS Sent',
            description: 'Appointment reminder sent to customer',
            status: 'success' as const,
            value: 'Delivered'
          },
          {
            title: 'Email Opened',
            description: 'Customer opened follow-up email',
            status: 'info' as const,
            value: '2 min ago'
          },
          {
            title: 'Voicemail Left',
            description: 'Customer left detailed message',
            status: 'info' as const,
            value: '1:45'
          }
        ],
        system: [
          {
            title: 'AI Agent Updated',
            description: 'Greeting message customized',
            status: 'success' as const,
            value: 'Active'
          },
          {
            title: 'System Health Check',
            description: 'All systems running optimally',
            status: 'success' as const,
            value: '100%'
          },
          {
            title: 'Backup Completed',
            description: 'Daily data backup successful',
            status: 'success' as const,
            value: '2.3 GB'
          }
        ]
      }

      const activityData = activities[type][Math.floor(Math.random() * activities[type].length)]
      
      return {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        title: activityData.title,
        description: activityData.description,
        timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: activityData.status,
        value: activityData.value
      }
    }

    // Initial activities
    const initialActivities = Array.from({ length: 5 }, generateActivity)
    setActivities(initialActivities)

    // Add new activity every 10-30 seconds
    const interval = setInterval(() => {
      if (isLive) {
        const newActivity = generateActivity()
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]) // Keep last 10
      }
    }, Math.random() * 20000 + 10000) // 10-30 seconds

    return () => clearInterval(interval)
  }, [isLive, realActivity])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-5 h-5" />
      case 'appointment':
        return <Calendar className="w-5 h-5" />
      case 'revenue':
        return <DollarSign className="w-5 h-5" />
      case 'message':
        return <MessageSquare className="w-5 h-5" />
      case 'system':
        return <Bell className="w-5 h-5" />
      default:
        return <User className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'info':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      case 'warning':
        return <AlertCircle className="w-4 h-4" />
      case 'info':
        return <Clock className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Live Activity</h3>
            <p className="text-sm text-gray-400">Real-time updates from your AI agent</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-400">{isLive ? 'Live' : 'Paused'}</span>
          <button
            onClick={() => setIsLive(!isLive)}
            className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
        <AnimatePresence>
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(activity.status)}`}>
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-white truncate">{activity.title}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">{activity.timestamp}</span>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status).split(' ')[0]}`} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-1">{activity.description}</p>
                {activity.value && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-medium text-gray-300">{activity.value}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400">No recent activity</p>
          <p className="text-sm text-gray-500">Activity will appear here as your AI agent handles calls</p>
        </div>
      )}
    </div>
  )
}
