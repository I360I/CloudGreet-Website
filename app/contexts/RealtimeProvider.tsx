'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
// import { useToast } from './ToastContext'

interface RealtimeContextType {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastActivity: Date | null
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [lastActivity, setLastActivity] = useState<Date | null>(null)
  // const { showInfo, showWarning } = useToast()

  useEffect(() => {
    // Simulate real-time connection
    const connect = () => {
      setConnectionStatus('connecting')
      
      // Simulate connection delay
      setTimeout(() => {
        setIsConnected(true)
        setConnectionStatus('connected')
        setLastActivity(new Date())
        // showInfo('Connected', 'Real-time updates are now active')
      }, 1000)
    }

    // Initial connection
    connect()

    // Simulate periodic activity
    const activityInterval = setInterval(() => {
      if (isConnected) {
        setLastActivity(new Date())
      }
    }, 30000) // Every 30 seconds

    // Simulate connection issues
    const connectionCheck = setInterval(() => {
      if (isConnected && Math.random() < 0.1) { // 10% chance of disconnection
        setIsConnected(false)
        setConnectionStatus('disconnected')
        // showWarning('Connection Lost', 'Attempting to reconnect...')
        
        // Auto-reconnect after 5 seconds
        setTimeout(() => {
          connect()
        }, 5000)
      }
    }, 60000) // Check every minute

    return () => {
      clearInterval(activityInterval)
      clearInterval(connectionCheck)
    }
  }, [isConnected])

  // Simulate real-time notifications
  useEffect(() => {
    if (!isConnected) return

    const notificationInterval = setInterval(() => {
      // Simulate various real-time events
      const events = [
        { type: 'call', message: 'New call received' },
        { type: 'sms', message: 'SMS message delivered' },
        { type: 'appointment', message: 'Appointment confirmed' },
        { type: 'lead', message: 'New lead scored' }
      ]

      if (Math.random() < 0.3) { // 30% chance of notification
        const event = events[Math.floor(Math.random() * events.length)]
        // showInfo(event.message, `Real-time update: ${event.type}`)
      }
    }, 45000) // Every 45 seconds

    return () => clearInterval(notificationInterval)
  }, [isConnected])

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      connectionStatus,
      lastActivity
    }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

// Connection Status Component
export function ConnectionStatus() {
  const { isConnected, connectionStatus, lastActivity } = useRealtime()

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400'
      case 'connecting': return 'text-yellow-400'
      case 'disconnected': return 'text-red-400'
      case 'error': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'disconnected': return 'Disconnected'
      case 'error': return 'Error'
      default: return 'Unknown'
    }
  }

  return (
    <div className="flex items-center space-x-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-400' : 'bg-red-400'
      } animate-pulse`} />
      <span className={getStatusColor()}>{getStatusText()}</span>
      {lastActivity && (
        <span className="text-gray-500">
          ({Math.floor((Date.now() - lastActivity.getTime()) / 1000)}s ago)
        </span>
      )}
    </div>
  )
}
