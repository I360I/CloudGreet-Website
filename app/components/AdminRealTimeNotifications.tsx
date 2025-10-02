'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Phone, 
  Users,
  Zap,
  Star
} from 'lucide-react'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'info' | 'urgent'
  title: string
  message: string
  timestamp: Date
  action?: {
    label: string
    onClick: () => void
  }
  autoClose?: boolean
  duration?: number
}

export default function AdminRealTimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Simulate real-time notifications
    const notificationInterval = setInterval(() => {
      const notificationTypes = [
        {
          type: 'success' as const,
          title: 'New Client Signed Up',
          message: 'ABC HVAC Services just completed onboarding',
          icon: Users
        },
        {
          type: 'urgent' as const,
          title: 'High-Value Lead Generated',
          message: 'Premier Painting Co (Rating: 4.8) added to CRM',
          icon: Star
        },
        {
          type: 'info' as const,
          title: 'Revenue Milestone',
          message: 'Monthly revenue target 85% achieved',
          icon: TrendingUp
        },
        {
          type: 'warning' as const,
          title: 'System Alert',
          message: 'API response time above 2s threshold',
          icon: AlertTriangle
        }
      ]

      // Random notification generation (10% chance every 30 seconds)
      if (Math.random() < 0.1) {
        const randomNotification = notificationTypes[Math.floor(Math.random() * notificationTypes.length)]
        const notification: Notification = {
          id: Date.now().toString(),
          type: randomNotification.type,
          title: randomNotification.title,
          message: randomNotification.message,
          timestamp: new Date(),
          autoClose: randomNotification.type !== 'urgent',
          duration: randomNotification.type === 'urgent' ? 10000 : 5000
        }

        addNotification(notification)
      }
    }, 30000)

    return () => clearInterval(notificationInterval)
  }, [])

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep only last 10
    setUnreadCount(prev => prev + 1)

    if (notification.autoClose) {
      setTimeout(() => {
        removeNotification(notification.id)
      }, notification.duration || 5000)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const markAllAsRead = () => {
    setUnreadCount(0)
    setIsOpen(false)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'urgent':
        return <Zap className="w-5 h-5 text-red-400" />
      default:
        return <Bell className="w-5 h-5 text-blue-400" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-500/5'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-500/5'
      case 'urgent':
        return 'border-l-red-500 bg-red-500/5'
      default:
        return 'border-l-blue-500 bg-blue-500/5'
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 border-l-4 ${getNotificationColor(notification.type)} hover:bg-gray-800/50 transition-colors`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-300 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {notification.timestamp.toLocaleTimeString()}
                            </span>
                            {notification.action && (
                              <button
                                onClick={notification.action.onClick}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                {notification.action.label}
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-700">
                <button className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
