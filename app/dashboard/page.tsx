"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OnboardingWizard from '../components/OnboardingWizard'
// import AIInsightsPanel from '../components/AIInsightsPanel' // Removed - component not used
import { 
  Phone, Brain, DollarSign, Calendar, TrendingUp,
  ChevronRight, BarChart3, Activity, Clock,
  ArrowUpRight, ArrowDownRight, Settings, Bell,
  MessageSquare, MapPin, User, RefreshCw,
  Star as StarIcon, Calendar as CalendarIcon,
  Clock as ClockIcon, Zap, FileText, LogOut,
  Eye, Play, Pause, Volume2, Download, Users,
  Target, Award, AlertCircle, CheckCircle
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')
  const [isLive, setIsLive] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [focusedElement, setFocusedElement] = useState(null)
  
  // Focus management functions
  const handleFocus = (elementId: string) => {
    setFocusedElement(elementId)
  }
  
  const handleBlur = () => {
    setFocusedElement(null)
  }
  
  const [dashboardData, setDashboardData] = useState({
    totalCalls: 0,
    totalRevenue: 0,
    activeCalls: 0,
    conversionRate: 0,
    emergencyCalls: 0,
    todayBookings: 0,
    missedCalls: 0,
    avgCallDuration: 0,
    customerSatisfaction: 0,
    monthlyRecurring: 0,
    callsToday: 0,
    callsThisWeek: 0,
    avgCallsPerDay: 0,
    businessName: '',
    phoneNumber: ''
  })

  const [recentCalls, setRecentCalls] = useState([])

  const [upcomingAppointments, setUpcomingAppointments] = useState([])

  useEffect(() => {
    // Check authentication first
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    // Check if user just created account and needs onboarding
    const accountStatus = localStorage.getItem('accountStatus')
    if (accountStatus === 'new_account') {
      setShowOnboarding(true)
    }
    
    loadDashboardData()
    
    // Set up real-time refresh every 30 seconds for live data
    const refreshInterval = setInterval(() => {
      loadDashboardData()
    }, 30000)
    
    // Set up WebSocket connection for real-time updates (future enhancement)
    // WebSocket connection for real-time updates (configure when needed)
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data)
    //   if (data.type === 'dashboard_update') {
    //     loadDashboardData()
    //   }
    // }
    
    return () => clearInterval(refreshInterval)
  }, [selectedTimeframe]) // Reload when timeframe changes

  const loadDashboardData = async () => {
    const startTime = performance.now()
    try {
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      const response = await fetch(`/api/dashboard/data?timeframe=${selectedTimeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Dashboard API Response received
        
        // Validate and sanitize data from API response
        const sanitizedData = {
          totalCalls: Math.max(0, parseInt(data.totalCalls) || 0),
          totalRevenue: Math.max(0, parseFloat(data.totalRevenue) || 0),
          activeCalls: Math.max(0, parseInt(data.activeCalls) || 0),
          conversionRate: Math.min(100, Math.max(0, parseFloat(data.conversionRate) || 0)),
          emergencyCalls: Math.max(0, parseInt(data.emergencyCalls) || 0),
          todayBookings: Math.max(0, parseInt(data.todayBookings) || 0),
          missedCalls: Math.max(0, parseInt(data.missedCalls) || 0),
          avgCallDuration: Math.max(0, parseFloat(data.avgCallDuration) || 0),
          customerSatisfaction: Math.min(5, Math.max(0, parseFloat(data.customerSatisfaction) || 0)),
          monthlyRecurring: Math.max(0, parseFloat(data.monthlyRecurring) || 0),
          callsToday: Math.max(0, parseInt(data.callsToday) || 0),
          callsThisWeek: Math.max(0, parseInt(data.callsThisWeek) || 0),
          avgCallsPerDay: Math.max(0, parseFloat(data.avgCallsPerDay) || 0),
          businessName: String(data.businessName || '').trim(),
          phoneNumber: String(data.phoneNumber || '').trim()
        }
        
        // Update dashboard data with validated values
        setDashboardData(prevData => ({
          ...prevData,
          ...sanitizedData
        }))
        
        // Update lists with real data or empty arrays
        setRecentCalls(data.recentCalls || [])
        setUpcomingAppointments(data.recentAppointments || [])
        setIsLive(data.isLive || false)
        setOnboardingCompleted(data.onboardingCompleted || false)
      } else {
        setError('Unable to load dashboard data. Please try again later.')
        // Don't fall back to mock data - show empty state instead
        setRecentCalls([])
        setUpcomingAppointments([])
      }
    } catch (error) {
      setError('Network connection error. Please check your internet connection and try again.')
      // Don't fall back to mock data - show empty state instead
      setRecentCalls([])
      setUpcomingAppointments([])
    } finally {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      // Dashboard data loaded successfully
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('businessData')
    localStorage.removeItem('accountStatus')
    window.location.href = '/login'
  }

  const handleRefresh = () => {
    setIsLoading(true)
    loadDashboardData()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Loading Dashboard</h2>
          <p className="text-gray-400">Setting up your AI receptionist...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Dashboard Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-700 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Premium Header */}
      <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Brain className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                  CloudGreet Dashboard
                </h1>
                <p className="text-gray-400 text-sm">AI Receptionist Control Center</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center space-x-3 px-4 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50"
              >
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="text-sm font-medium text-gray-300">
                  {isLive ? 'AI Active' : 'AI Inactive'}
                </span>
              </motion.div>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-all border border-gray-700/50"
              >
                <Bell className="w-5 h-5 text-gray-300" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="p-3 rounded-xl bg-gray-800/50 hover:bg-red-600/20 transition-all border border-gray-700/50 hover:border-red-500/30"
              >
                <LogOut className="w-5 h-5 text-gray-300 hover:text-red-400" />
              </motion.button>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg"
              >
                <User className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-blue-300 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-400 text-lg">Here's what's happening with your AI receptionist</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {['24h', '7d', '30d', '90d'].map((timeframe) => (
              <motion.button
                key={timeframe}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  selectedTimeframe === timeframe
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
                }`}
              >
                {timeframe}
              </motion.button>
            ))}
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            <div className="relative bg-gray-800/20 backdrop-blur-xl p-6 rounded-2xl border border-blue-500/20 group-hover:border-blue-400/40 transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"
                >
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </motion.div>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-200">Total Calls</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-blue-400">{dashboardData.totalCalls}</p>
                <span className="text-sm text-green-400 font-semibold">+12%</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">This week</p>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            <div className="relative bg-gray-800/20 backdrop-blur-xl p-6 rounded-2xl border border-green-500/20 group-hover:border-green-400/40 transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                  className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"
                >
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </motion.div>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-200">Revenue</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-green-400">${dashboardData.totalRevenue.toLocaleString()}</p>
                <span className="text-sm text-green-400 font-semibold">+23%</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">This week</p>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            <div className="relative bg-gray-800/20 backdrop-blur-xl p-6 rounded-2xl border border-purple-500/20 group-hover:border-purple-400/40 transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                  className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"
                >
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </motion.div>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-200">Bookings</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-purple-400">{dashboardData.todayBookings}</p>
                <span className="text-sm text-green-400 font-semibold">+18%</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Today</p>
            </div>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            <div className="relative bg-gray-800/20 backdrop-blur-xl p-6 rounded-2xl border border-yellow-500/20 group-hover:border-yellow-400/40 transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"
                >
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </motion.div>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-200">Conversion</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-yellow-400">{dashboardData.conversionRate}%</p>
                <span className="text-sm text-green-400 font-semibold">+5%</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Call to booking</p>
            </div>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Calls */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gray-800/20 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Recent Calls</h3>
                <motion.button
                  onClick={handleRefresh}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 hover:bg-purple-600/30 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </motion.button>
              </div>
              
              <div className="space-y-4">
                {recentCalls.length > 0 ? (
                  recentCalls.map((call, index) => (
                    <motion.div
                      key={call.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl border border-gray-600/30 hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          call.status === 'emergency' ? 'bg-red-500/20 border border-red-500/30' :
                          call.status === 'booked' ? 'bg-green-500/20 border border-green-500/30' :
                          'bg-blue-500/20 border border-blue-500/30'
                        }`}>
                          <Phone className={`w-6 h-6 ${
                            call.status === 'emergency' ? 'text-red-400' :
                            call.status === 'booked' ? 'text-green-400' :
                            'text-blue-400'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{call.caller || call.from_number}</h4>
                          <p className="text-sm text-gray-400">{call.phone || call.from_number} • {call.service || 'Service'}</p>
                          <p className="text-xs text-gray-500">{call.timestamp || new Date(call.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-400">${call.revenue || call.estimated_value || 0}</p>
                        <p className="text-sm text-gray-400">{call.duration || `${call.duration || 0}s`}</p>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          call.status === 'emergency' ? 'bg-red-500/20 text-red-400' :
                          call.status === 'booked' || call.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {call.status === 'emergency' && <AlertCircle className="w-3 h-3" />}
                          {(call.status === 'booked' || call.status === 'completed') && <CheckCircle className="w-3 h-3" />}
                          {call.status}
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Phone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No Recent Calls</h3>
                    <p className="text-gray-500">Your AI receptionist hasn't received any calls yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* AI Insights Panel */}
            <AIInsightsPanel businessId={dashboardData.businessName} />
            
            {/* Upcoming Appointments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-gray-800/20 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Upcoming</h3>
                <Link
                  href="/appointments"
                  className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium"
                >
                  View All
                </Link>
              </div>
              
              <div className="space-y-4">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appointment, index) => (
                    <motion.div
                      key={appointment.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="p-4 bg-gray-700/30 rounded-xl border border-gray-600/30 hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{appointment.customer || appointment.customer_name}</h4>
                        <span className="text-sm text-purple-400 font-medium">{appointment.time || new Date(appointment.scheduled_date).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{appointment.service || 'Service'}</p>
                      <p className="text-xs text-gray-500">{appointment.date || new Date(appointment.scheduled_date).toLocaleDateString()} • {appointment.address || 'No address provided'}</p>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No Upcoming Appointments</h3>
                    <p className="text-gray-500">No appointments are scheduled yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 bg-gray-800/20 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6"
        >
          <h3 className="text-2xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/calls"
              className="group p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30 hover:border-blue-400/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
                <span className="font-medium text-white">View Calls</span>
              </div>
            </Link>
            
            <Link
              href="/appointments"
              className="group p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl border border-green-500/30 hover:border-green-400/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-green-400 group-hover:text-green-300" />
                <span className="font-medium text-white">Appointments</span>
              </div>
            </Link>
            
            <Link
              href="/quotes"
              className="group p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30 hover:border-purple-400/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                <span className="font-medium text-white">AI Quotes</span>
              </div>
            </Link>
            
            <button className="group p-4 bg-gradient-to-r from-gray-600/20 to-gray-700/20 rounded-xl border border-gray-500/30 hover:border-gray-400/50 transition-all">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-gray-400 group-hover:text-gray-300" />
                <span className="font-medium text-white">Settings</span>
              </div>
            </button>
          </div>
        </motion.div>
      </main>
      
      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setOnboardingCompleted(true)
          setShowOnboarding(false)
          setIsLive(true)
          localStorage.removeItem('accountStatus')
          loadDashboardData()
        }}
      />
    </div>
  )
}