import { useState, useEffect, useCallback, useRef } from 'react'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'system'
  title: string
  message: string
  data?: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: string
  read: boolean
  readAt?: string
  expiresAt?: string
  userId: string
}

export interface UseNotificationsOptions {
  userId?: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxRetries?: number
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  isConnected: boolean
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  deleteAllNotifications: () => Promise<void>
  refreshNotifications: () => Promise<void>
  createNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>) => Promise<void>
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    userId = 'anonymous',
    autoConnect = true,
    reconnectInterval = 5000,
    maxRetries = 5
  } = options

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/notifications?userId=${userId}&limit=100`)
      const data = await response.json()
      
      if (data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread || 0)
      } else {
        setError(data.error || 'Failed to fetch notifications')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Connect to SSE stream
  const connectToSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
        retryCountRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'connected') {
            console.log('Connected to notifications stream')
          } else if (data.type === 'heartbeat') {
            // Keep connection alive
            return
          } else {
            // New notification received
            const newNotification: Notification = {
              id: data.id,
              type: data.type,
              title: data.title,
              message: data.message,
              data: data.data,
              priority: data.priority,
              timestamp: data.timestamp,
              read: false,
              userId
            }
            
            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)
            
            // Show browser notification if permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico',
                tag: newNotification.id
              })
            }
          }
        } catch (parseError) {
          console.error('Failed to parse SSE message:', parseError)
        }
      }

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event)
        setIsConnected(false)
        
        // Attempt to reconnect
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            connectToSSE()
          }, reconnectInterval)
        } else {
          setError('Failed to maintain connection to notifications service')
        }
      }

    } catch (err) {
      setError('Failed to connect to notifications service')
      setIsConnected(false)
    }
  }, [userId, reconnectInterval, maxRetries])

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationIds })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setNotifications(prev => 
          prev.map(notification => 
            notificationIds.includes(notification.id) 
              ? { ...notification, read: true, readAt: new Date().toISOString() }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      } else {
        setError(data.error || 'Failed to mark notifications as read')
      }
    } catch (err) {
      setError('Failed to mark notifications as read')
    }
  }, [userId])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAllRead: true })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setNotifications(prev => 
          prev.map(notification => ({ 
            ...notification, 
            read: true, 
            readAt: new Date().toISOString() 
          }))
        )
        setUnreadCount(0)
      } else {
        setError(data.error || 'Failed to mark all notifications as read')
      }
    } catch (err) {
      setError('Failed to mark all notifications as read')
    }
  }, [userId])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}&ids=${notificationId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setNotifications(prev => {
          const deleted = prev.find(n => n.id === notificationId)
          return prev.filter(notification => notification.id !== notificationId)
        })
        setUnreadCount(prev => {
          const deleted = notifications.find(n => n.id === notificationId)
          return deleted && !deleted.read ? Math.max(0, prev - 1) : prev
        })
      } else {
        setError(data.error || 'Failed to delete notification')
      }
    } catch (err) {
      setError('Failed to delete notification')
    }
  }, [userId, notifications])

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}&deleteAll=true`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setNotifications([])
        setUnreadCount(0)
      } else {
        setError(data.error || 'Failed to delete all notifications')
      }
    } catch (err) {
      setError('Failed to delete all notifications')
    }
  }, [userId])

  // Create notification (for testing/admin purposes)
  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...notification, userId })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        setError(data.error || 'Failed to create notification')
      }
    } catch (err) {
      setError('Failed to create notification')
    }
  }, [userId])

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }, [])

  // Initialize
  useEffect(() => {
    fetchNotifications()
    
    if (autoConnect) {
      connectToSSE()
      requestNotificationPermission()
    }

    return () => {
      disconnect()
    }
  }, [userId, autoConnect, fetchNotifications, connectToSSE, disconnect, requestNotificationPermission])

  // Cleanup expired notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setNotifications(prev => 
        prev.filter(notification => 
          !notification.expiresAt || new Date(notification.expiresAt) > now
        )
      )
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications: fetchNotifications,
    createNotification
  }
}
