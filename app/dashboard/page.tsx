"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OnboardingWizard from '../components/OnboardingWizard'
import { 
  Phone, Brain, DollarSign, Calendar, TrendingUp,
  ChevronRight, BarChart3, Activity, Clock,
  ArrowUpRight, ArrowDownRight, Settings, Bell,
  MessageSquare, MapPin, User, RefreshCw,
  Star as StarIcon, Calendar as CalendarIcon,
  Clock as ClockIcon, Zap
} from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')
  const [isLive, setIsLive] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  
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
    avgCallsPerDay: 0
  })

  const [recentCalls, setRecentCalls] = useState([])
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [liveFeed, setLiveFeed] = useState([])

  useEffect(() => {
    // Check authentication first
    const token = localStorage.getItem('token')
    if (!token) {
      // Redirect to login if no token
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
    
    return () => clearInterval(refreshInterval)
  }, [])

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        // No auth token, redirect to login
        window.location.href = '/login'
        return
      }

      const response = await fetch('/api/dashboard/data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
        
        // Load real data for calls and appointments
        setRecentCalls(data.recentCalls || [])
        setUpcomingAppointments(data.recentAppointments || [])
      } else {
        // API failed, show empty state
        console.error('Failed to load dashboard data')
      }
    } catch (error) {
      // Error occurred, show empty state
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Clean Header */}
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/landing" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CloudGreet</h1>
                <p className="text-xs text-gray-400 font-medium">AI RECEPTIONIST</p>
              </div>
            </Link>
              
            <div className="flex items-center space-x-3 ml-8">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                isLive 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-green-400' : 'bg-gray-400'
                }`} />
                <span>{isLive ? 'Live' : 'Offline'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <Bell className="w-5 h-5 text-gray-300" />
              </button>
              <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <Settings className="w-5 h-5 text-gray-300" />
              </button>
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
            <p className="text-gray-400">Real-time insights and analytics</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {['24h', '7d', '30d', '90d'].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTimeframe === timeframe
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {[
            {
              icon: Phone,
              label: "Total Calls",
              value: dashboardData.totalCalls,
              change: "+12%",
              changeType: "positive",
              color: "text-blue-400"
            },
            {
              icon: DollarSign,
              label: "Revenue",
              value: `$${dashboardData.totalRevenue.toLocaleString()}`,
              change: "+18%",
              changeType: "positive",
              color: "text-green-400"
            },
            {
              icon: Activity,
              label: "Conversion Rate",
              value: `${dashboardData.conversionRate}%`,
              change: "+12%",
              changeType: "positive",
              color: "text-purple-400"
            },
            {
              icon: TrendingUp,
              label: "Monthly Recurring",
              value: `$${dashboardData.monthlyRecurring.toLocaleString()}`,
              change: "+18%",
              changeType: "positive",
              color: "text-orange-400"
            },
            {
              icon: StarIcon,
              label: "Satisfaction",
              value: `${dashboardData.customerSatisfaction}/5`,
              change: "+0.3",
              changeType: "positive",
              color: "text-yellow-400"
            },
            {
              icon: Clock,
              label: "Avg Call Time",
              value: `${dashboardData.avgCallDuration}min`,
              change: "-0.5min",
              changeType: "positive",
              color: "text-indigo-400"
            },
            {
              icon: Phone,
              label: "Calls Today",
              value: dashboardData.callsToday || 0,
              change: `+${dashboardData.avgCallsPerDay || 0}/day avg`,
              changeType: "positive",
              color: "text-green-400"
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gray-800`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="w-4 h-4 inline mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 inline mr-1" />
                  )}
                  {stat.change}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-800 mb-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'calls', label: 'Calls', icon: Phone },
              { id: 'appointments', label: 'Appointments', icon: Calendar },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {selectedTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-blue-400" />
                        Recent Activity
                      </h3>
                      <button 
                        onClick={() => loadDashboardData()}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {liveFeed.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-gray-700">
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">{item.message}</p>
                            <p className="text-gray-400 text-sm">{item.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                        <Phone className="w-4 h-4 inline mr-2" />
                        Test Call
                      </button>
                      <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Schedule Demo
                      </button>
                      <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                        <Settings className="w-4 h-4 inline mr-2" />
                        Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setOnboardingCompleted(true)
          setShowOnboarding(false)
          setIsLive(true)
          // Clear onboarding status since onboarding is complete
          localStorage.removeItem('accountStatus')
          loadDashboardData()
        }}
      />
    </div>
  )
}
