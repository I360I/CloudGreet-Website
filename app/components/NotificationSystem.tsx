'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Bell, 
  Phone, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react'

interface Notification {
  id: string
  type: 'call' | 'booking' | 'system' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationSystemProps {
  onNotificationClick?: (notification: Notification) => void
}

export default function NotificationSystem({ onNotificationClick }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const notificationSoundRef = useRef<HTMLAudioElement>(null)

  // Create audio elements for notification sounds
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create notification sound
      notificationSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
      
      // Create call ringtone
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
    }
  }, [])

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate incoming calls (20% chance every 30 seconds)
      if (Math.random() < 0.2) {
        addNotification({
          type: 'call',
          title: 'Incoming Call',
          message: 'New call from potential customer',
          action: {
            label: 'Answer',
            onClick: () => console.log('Answering call...')
          }
        })
      }

      // Simulate bookings (10% chance every 30 seconds)
      if (Math.random() < 0.1) {
        addNotification({
          type: 'booking',
          title: 'New Booking',
          message: 'Customer scheduled a service appointment',
          action: {
            label: 'View Details',
            onClick: () => console.log('Viewing booking details...')
          }
        })
      }

      // Simulate system notifications (5% chance every 30 seconds)
      if (Math.random() < 0.05) {
        const systemMessages = [
          'AI performance optimized',
          'System backup completed',
          'New feature available',
          'Scheduled maintenance in 2 hours'
        ]
        addNotification({
          type: 'system',
          title: 'System Update',
          message: systemMessages[Math.floor(Math.random() * systemMessages.length)]
        })
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    }

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]) // Keep last 50 notifications
    setUnreadCount(prev => prev + 1)

    // Play notification sound
    if (soundEnabled && notificationSoundRef.current) {
      notificationSoundRef.current.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      })
    }

    // Auto-remove after 10 seconds for non-critical notifications
    if (!['call', 'booking'].includes(notification.type)) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, 10000)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id)
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1))
      }
      return prev.filter(n => n.id !== id)
    })
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    )
    setUnreadCount(0)
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'call':
        return <Phone className="w-5 h-5 text-blue-500" />
      case 'booking':
        return <Calendar className="w-5 h-5 text-green-500" />
      case 'system':
        return <Settings className="w-5 h-5 text-purple-500" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <Bell className="w-5 h-5 text-slate-500" />
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'call':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'booking':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20'
      case 'system':
        return 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20'
      case 'success':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'error':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      default:
        return 'border-l-slate-500 bg-slate-50 dark:bg-slate-900/20'
    }
  }

  const formatTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                      !notification.read ? 'bg-opacity-50' : ''
                    } hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                      onNotificationClick?.(notification)
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            !notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${
                          !notification.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {notification.message}
                        </p>
                        {notification.action && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              notification.action?.onClick()
                            }}
                            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                          >
                            {notification.action.label}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeNotification(notification.id)
                        }}
                        className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => {
                  setNotifications([])
                  setUnreadCount(0)
                }}
                className="w-full text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// Export function to add notifications from other components
export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
  // This would be connected to a global notification system
  // For now, it's handled internally by the component
  console.log('Notification:', notification)
}