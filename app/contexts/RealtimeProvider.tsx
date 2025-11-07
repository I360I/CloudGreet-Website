'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useToast } from './ToastContext'
import { logger } from '@/lib/monitoring'

interface RealtimeContextType {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastActivity: Date | null
  newCalls: number
  newAppointments: number
  newMessages: number
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [lastActivity, setLastActivity] = useState<Date | null>(null)
  const [newCalls, setNewCalls] = useState(0)
  const [newAppointments, setNewAppointments] = useState(0)
  const [newMessages, setNewMessages] = useState(0)
  
  // Always call hooks at the top level
  const toast = useToast()
  
  // Only use toast in browser (not during SSR/prerendering)
  const showSuccess = typeof window !== 'undefined' ? toast.showSuccess : () => {}
  const showInfo = typeof window !== 'undefined' ? toast.showInfo : () => {}

  useEffect(() => {
    // Get business ID from localStorage
    const user = localStorage.getItem('user')
    if (!user) return

    let businessId: string
    try {
      const userData = JSON.parse(user)
      businessId = userData.business_id
      if (!businessId) return
    } catch (error) {
      logger.error('Failed to parse user data:', { error: error instanceof Error ? error.message : 'Unknown error' })
      return
    }

    // Initialize Supabase client for realtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      logger.warn('Supabase not configured, real-time updates disabled')
      setConnectionStatus('disconnected')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })

    setConnectionStatus('connecting')

    // Subscribe to calls table for new calls
    const callsChannel = supabase
      .channel('calls-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          
          setNewCalls(prev => prev + 1)
          setLastActivity(new Date())
          
          const call = payload.new as any
          showInfo(
            'New Call Received',
            `Incoming call from ${call.from_number || 'Unknown'}`
          )
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          
          setIsConnected(true)
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error')
          setIsConnected(false)
        }
      })

    // Subscribe to appointments table for new appointments
    const appointmentsChannel = supabase
      .channel('appointments-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          
          setNewAppointments(prev => prev + 1)
          setLastActivity(new Date())
          
          const appointment = payload.new as any
          showSuccess(
            'Appointment Booked!',
            `${appointment.customer_name} scheduled for ${new Date(appointment.scheduled_date).toLocaleDateString()}`
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          
          setLastActivity(new Date())
          
          const appointment = payload.new as any
          if (appointment.status === 'cancelled') {
            showInfo(
              'Appointment Cancelled',
              `${appointment.customer_name}'s appointment was cancelled`
            )
          } else if (appointment.status === 'completed') {
            showSuccess(
              'Appointment Completed',
              `${appointment.customer_name}'s appointment is done`
            )
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          
        }
      })

    // Subscribe to conversation_history for new messages
    const messagesChannel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_history',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          
          setNewMessages(prev => prev + 1)
          setLastActivity(new Date())
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          
        }
      })

    // Monitor connection health
    const healthCheck = setInterval(() => {
      setLastActivity(new Date())
    }, 30000) // Ping every 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(healthCheck)
      supabase.removeChannel(callsChannel)
      supabase.removeChannel(appointmentsChannel)
      supabase.removeChannel(messagesChannel)
      setIsConnected(false)
      setConnectionStatus('disconnected')
    }
  }, [])

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      connectionStatus,
      lastActivity,
      newCalls,
      newAppointments,
      newMessages
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
