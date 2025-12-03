'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Bell, Settings, CheckCircle, AlertCircle, Clock, Mail, Phone, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/monitoring'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { SkeletonList } from '@/app/components/ui/SkeletonLoader'
import SkeletonLoader from '@/app/components/ui/SkeletonLoader'

interface Notification {
  id: string
  type: 'call' | 'sms' | 'email' | 'system' | 'billing'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'calls' | 'system'>('all')

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      // Load real notifications from API - authentication handled automatically by fetchWithAuth
      const response = await fetchWithAuth('/api/notifications/list')

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      } else {
        setNotifications([])
      }
    } catch (error) {
      logger.error('Error loading notifications', { error: error instanceof Error ? error.message : 'Unknown error' })
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-5 h-5 text-blue-400" />
      case 'sms':
        return <MessageSquare className="w-5 h-5 text-green-400" />
      case 'email':
        return <Mail className="w-5 h-5 text-purple-400" />
      case 'billing':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      default:
        return <Bell className="w-5 h-5 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500/30 bg-red-500/10'
      case 'high':
        return 'border-orange-500/30 bg-orange-500/10'
      case 'medium':
        return 'border-blue-500/30 bg-blue-500/10'
      default:
        return 'border-gray-500/30 bg-gray-500/10'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read
      case 'calls':
        return notification.type === 'call'
      case 'system':
        return notification.type === 'system'
      default:
        return true
    }
  })

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-4">
          <SkeletonLoader variant="rectangular" height={48} width="40%" className="mb-6" />
          <SkeletonList items={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-white/10 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-6 h-6 text-white" aria-hidden="true" />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">Notifications</h1>
                <p className="text-gray-400 text-sm md:text-base">Stay updated with your AI receptionist</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <Bell className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">
                    {unreadCount} Unread
                  </span>
                </div>
              )}
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-3 min-h-[44px] bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-black"
                  aria-label="Mark all notifications as read"
                >
                  Mark All Read
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex space-x-2 bg-gray-800/50 rounded-xl p-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'calls', label: 'Calls' },
            { key: 'system', label: 'System' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as 'all' | 'unread' | 'calls' | 'system')}
              className={`px-4 py-3 min-h-[44px] rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
              aria-label={`Filter notifications by ${tab.label.toLowerCase()}`}
              aria-pressed={filter === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-blue-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Bell className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">No Notifications</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              {filter === 'unread' 
                ? 'You\'re all caught up! No unread notifications.'
                : `No ${filter} notifications found.`
              }
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => markAsRead(notification.id)}
                className={`bg-white/5 backdrop-blur-xl rounded-xl border p-4 hover:border-white/20 transition-all cursor-pointer ${
                  !notification.read ? 'border-white/20' : 'border-white/10'
                } ${getPriorityColor(notification.priority)}`}
              >
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-gray-800/50 rounded-lg">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500 text-xs">
                            {new Date(notification.timestamp).toLocaleString()}
                          </span>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      {!notification.read && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  )
}
