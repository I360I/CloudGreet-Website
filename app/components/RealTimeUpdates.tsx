'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Calendar, DollarSign, X, CheckCircle } from 'lucide-react'

interface RealtimeNotification {
  id: string
  type: 'call' | 'appointment' | 'payment' | 'sms'
  title: string
  message: string
  timestamp: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

interface RealTimeUpdatesProps {
  businessId: string
}

export default function RealTimeUpdates({ businessId }: RealTimeUpdatesProps) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString())

  useEffect(() => {
    // Poll for new activity every 5 seconds
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return

        // Check for new calls
        const callsRes = await fetch(`/api/calls/history?since=${lastCheck}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (callsRes.ok) {
          const callsData = await callsRes.json()
          const newCalls = callsData.calls || []

          newCalls.forEach((call: any) => {
            const notification: RealtimeNotification = {
              id: `call-${call.id}`,
              type: 'call',
              title: 'New Call',
              message: `Call from ${call.from_number} - ${call.status}`,
              timestamp: call.created_at,
              priority: call.status === 'missed' ? 'high' : 'normal'
            }
            
            addNotification(notification)
          })
        }

        // Check for new appointments
        const appointmentsRes = await fetch(`/api/appointments/list?since=${lastCheck}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (appointmentsRes.ok) {
          const appointmentsData = await appointmentsRes.json()
          const newAppointments = appointmentsData.appointments || []

          newAppointments.forEach((apt: any) => {
            const notification: RealtimeNotification = {
              id: `appointment-${apt.id}`,
              type: 'appointment',
              title: 'New Appointment',
              message: `${apt.customer_name} - ${apt.service_type}`,
              timestamp: apt.created_at,
              priority: 'high'
            }
            
            addNotification(notification)
          })
        }

        setLastCheck(new Date().toISOString())
      } catch (error) {
        console.error('Real-time update error:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [businessId, lastCheck])

  const addNotification = (notification: RealtimeNotification) => {
    setNotifications(prev => {
      // Check if notification already exists
      if (prev.some(n => n.id === notification.id)) {
        return prev
      }
      // Add new notification and keep only last 5
      return [notification, ...prev].slice(0, 5)
    })

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      dismissNotification(notification.id)
    }, 10000)
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-5 h-5" />
      case 'appointment':
        return <Calendar className="w-5 h-5" />
      case 'payment':
        return <DollarSign className="w-5 h-5" />
      default:
        return <CheckCircle className="w-5 h-5" />
    }
  }

  const getColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'from-red-500/20 to-orange-500/20 border-red-500/30'
      case 'high':
        return 'from-orange-500/20 to-yellow-500/20 border-orange-500/30'
      case 'normal':
        return 'from-blue-500/20 to-purple-500/20 border-blue-500/30'
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-500/30'
    }
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-96 max-w-full space-y-3">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className={`bg-gradient-to-r ${getColor(notification.priority)} backdrop-blur-xl rounded-xl border p-4 shadow-2xl`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="p-2 bg-white/10 rounded-lg">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-sm">{notification.title}</h4>
                  <p className="text-gray-300 text-xs mt-1">{notification.message}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}




