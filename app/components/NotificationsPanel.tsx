'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  RefreshCw,
  Settings
} from 'lucide-react'
import { useNotifications, Notification } from '@/app/hooks/useNotifications'

interface NotificationsPanelProps {
  userId?: string
  maxHeight?: string
  showHeader?: boolean
  compact?: boolean
}

export default function NotificationsPanel({ 
  userId = 'anonymous',
  maxHeight = '400px',
  showHeader = true,
  compact = false
}: NotificationsPanelProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications
  } = useNotifications({ userId })

  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())
  const [showSettings, setShowSettings] = useState(false)

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'system':
        return <Settings className="w-5 h-5 text-blue-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getNotificationStyles = (notification: Notification) => {
    const baseStyles = "border-l-4 p-4 rounded-lg shadow-sm transition-all"
    
    switch (notification.type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-500 text-green-900`
      case 'error':
        return `${baseStyles} bg-red-50 border-red-500 text-red-900`
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-500 text-yellow-900`
      case 'system':
        return `${baseStyles} bg-blue-50 border-blue-500 text-blue-900`
      default:
        return `${baseStyles} bg-gray-50 border-gray-500 text-gray-900`
    }
  }

  const getPriorityBadge = (priority: Notification['priority']) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-yellow-100 text-yellow-800',
      urgent: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[priority]}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead([notification.id])
    }
  }

  const handleSelectNotification = (notificationId: string) => {
    const newSelection = new Set(selectedNotifications)
    if (newSelection.has(notificationId)) {
      newSelection.delete(notificationId)
    } else {
      newSelection.add(notificationId)
    }
    setSelectedNotifications(newSelection)
  }

  const handleBulkAction = async (action: 'read' | 'delete') => {
    const selectedIds = Array.from(selectedNotifications)
    
    if (action === 'read') {
      await markAsRead(selectedIds)
    } else if (action === 'delete') {
      for (const id of selectedIds) {
        await deleteNotification(id)
      }
    }
    
    setSelectedNotifications(new Set())
  }

  const handleSelectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set())
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)))
    }
  }

  if (compact) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {unreadCount > 0 ? `${unreadCount} unread` : 'No notifications'}
          </span>
          {!isConnected && (
            <div className="w-2 h-2 bg-red-500 rounded-full" title="Disconnected" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-md w-full">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isConnected && (
              <div className="w-2 h-2 bg-red-500 rounded-full" title="Disconnected" />
            )}
            <button
              onClick={refreshNotifications}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="p-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedNotifications.size} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('read')}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Mark Read
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {selectedNotifications.size === notifications.length ? 'Deselect All' : 'Select All'}
          </button>
          
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-green-600 hover:text-green-800 transition-colors"
              >
                Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={deleteAllNotifications}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {isLoading && notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`border-b border-gray-100 last:border-b-0 ${
                  !notification.read ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={() => handleSelectNotification(notification.id)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  
                  {/* Notification Content */}
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getNotificationIcon(notification.type)}
                        <h4 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(notification.priority)}
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      {notification.message}
                    </p>
                    
                    {notification.data && (
                      <div className="text-xs text-gray-500 bg-gray-100 rounded p-2">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(notification.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead([notification.id])}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
