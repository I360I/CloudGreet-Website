'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, Calendar, Users, DollarSign, TrendingUp, 
  Settings, LogOut, Bell, ArrowRight, CheckCircle, 
  Clock, AlertCircle, Play, Pause, Eye
} from 'lucide-react'
import Link from 'next/link'
import NetworkErrorHandler from '../components/NetworkErrorHandler'
import ConnectionStatusIndicator from '../components/ConnectionStatus'
import { useToast } from '../contexts/ToastContext'

interface DashboardData {
  businessName: string
  phoneNumber: string
  isActive: boolean
  totalCalls: number
  totalAppointments: number
  totalRevenue: number
  recentCalls: Array<{
    id: string
    caller: string
    duration: string
    status: string
    date: string
  }>
  upcomingAppointments: Array<{
    id: string
    customer: string
    service: string
    date: string
    time: string
  }>
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to view dashboard')
        return
      }

      const response = await fetch('/api/dashboard/data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDashboardData({
            businessName: data.data.businessName || 'Your Business',
            phoneNumber: data.data.phoneNumber || 'Not configured',
            isActive: data.data.isActive || false,
            totalCalls: data.data.totalCalls || 0,
            totalAppointments: data.data.totalAppointments || 0,
            totalRevenue: data.data.totalRevenue || 0,
            recentCalls: data.data.recentCalls || [],
            upcomingAppointments: data.data.upcomingAppointments || []
          })
        } else {
          setError(data.message || 'Failed to load dashboard data')
        }
      } else {
        setError('Failed to load dashboard data')
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'Not configured') return phone
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  }

  if (isLoading) {
    return (
      <NetworkErrorHandler>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </NetworkErrorHandler>
    )
  }

  if (error) {
    return (
      <NetworkErrorHandler>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadDashboardData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </NetworkErrorHandler>
    )
  }

  return (
    <NetworkErrorHandler>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
        {/* Header */}
        <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Dashboard</h1>
                  <p className="text-gray-400">{dashboardData?.businessName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <ConnectionStatusIndicator />
                
                <Link href="/settings">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </motion.button>
                </Link>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <LogOut className="w-5 h-5 text-red-400" />
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  dashboardData?.isActive 
                    ? 'bg-green-500/20 border border-green-500/30' 
                    : 'bg-yellow-500/20 border border-yellow-500/30'
                }`}>
                  {dashboardData?.isActive ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {dashboardData?.isActive ? 'AI Agent Active' : 'Setup Required'}
                  </h2>
                  <p className="text-gray-400">
                    {dashboardData?.isActive 
                      ? `Phone: ${formatPhoneNumber(dashboardData.phoneNumber)}`
                      : 'Complete setup to activate your AI agent'
                    }
                  </p>
                </div>
              </div>
              
              {!dashboardData?.isActive && (
                <Link href="/billing">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    Complete Setup
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              )}
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Phone className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1">{dashboardData?.totalCalls || 0}</h3>
              <p className="text-gray-400">Total Calls</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1">{dashboardData?.totalAppointments || 0}</h3>
              <p className="text-gray-400">Appointments</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1">{formatCurrency(dashboardData?.totalRevenue || 0)}</h3>
              <p className="text-gray-400">Revenue</p>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <Link href="/test-agent">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 transition-colors text-left"
                >
                  <Play className="w-8 h-8 text-blue-400 mb-2" />
                  <h3 className="font-semibold">Test Agent</h3>
                  <p className="text-sm text-gray-400">Test your AI receptionist</p>
                </motion.button>
              </Link>
              
              <Link href="/calls">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 transition-colors text-left"
                >
                  <Phone className="w-8 h-8 text-green-400 mb-2" />
                  <h3 className="font-semibold">Call Logs</h3>
                  <p className="text-sm text-gray-400">View call history</p>
                </motion.button>
              </Link>
              
              <Link href="/appointments">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 transition-colors text-left"
                >
                  <Calendar className="w-8 h-8 text-purple-400 mb-2" />
                  <h3 className="font-semibold">Appointments</h3>
                  <p className="text-sm text-gray-400">Manage bookings</p>
                </motion.button>
              </Link>
              
              <Link href="/billing">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-4 transition-colors text-left"
                >
                  <Settings className="w-8 h-8 text-yellow-400 mb-2" />
                  <h3 className="font-semibold">Billing</h3>
                  <p className="text-sm text-gray-400">Manage subscription</p>
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Calls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Calls</h2>
                <Link href="/calls" className="text-blue-400 hover:text-blue-300 text-sm">
                  View All
                </Link>
              </div>
              
              {dashboardData?.recentCalls && dashboardData.recentCalls.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentCalls.slice(0, 3).map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-medium">{call.caller}</p>
                        <p className="text-sm text-gray-400">{call.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{call.duration}</p>
                        <p className={`text-xs ${
                          call.status === 'answered' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {call.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Phone className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No calls yet</p>
                  <p className="text-sm text-gray-500">Calls will appear here once your agent is active</p>
                </div>
              )}
            </motion.div>

            {/* Upcoming Appointments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
                <Link href="/appointments" className="text-blue-400 hover:text-blue-300 text-sm">
                  View All
                </Link>
              </div>
              
              {dashboardData?.upcomingAppointments && dashboardData.upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.upcomingAppointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-medium">{appointment.customer}</p>
                        <p className="text-sm text-gray-400">{appointment.service}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{appointment.date}</p>
                        <p className="text-xs text-gray-400">{appointment.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No appointments yet</p>
                  <p className="text-sm text-gray-500">Appointments will appear here once booked</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </NetworkErrorHandler>
  )
}