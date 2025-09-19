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

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')
  const [isLive, setIsLive] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(true)
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
    monthlyRecurring: 0
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
    if (accountStatus === 'demo') {
      setShowOnboarding(true)
    }
    
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        // No auth token, show demo data
        loadDemoData()
        setIsLoading(false)
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
        setIsDemoMode(data.isDemo || false)
        
        // Load real data for calls and appointments
        if (!data.isDemo) {
          setRecentCalls(data.recentCalls || [])
          setUpcomingAppointments(data.recentAppointments || [])
        }
      } else {
        // API failed, show demo data
        loadDemoData()
      }
    } catch (error) {
      // Error occurred, show demo data
      loadDemoData()
    }

    setIsLoading(false)
  }

  const loadDemoData = () => {
    setDashboardData({
      totalCalls: 247,
      totalRevenue: 45680,
      activeCalls: 3,
      conversionRate: 78,
      emergencyCalls: 12,
      todayBookings: 8,
      missedCalls: 5,
      avgCallDuration: 4.2,
      customerSatisfaction: 4.8,
      monthlyRecurring: 12800
    })

    setRecentCalls([
      {
        id: 1,
        customer: 'John Smith',
        phone: '+1 (555) 123-4567',
        type: 'HVAC Service',
        duration: '4:32',
        status: 'completed',
        outcome: 'appointment_booked',
        timestamp: '2 minutes ago',
        transcript: 'Customer called about AC not working. Scheduled service for tomorrow at 2 PM.',
        satisfaction: 5,
        isDemo: true
      },
      {
        id: 2,
        customer: 'Sarah Johnson',
        phone: '+1 (555) 987-6543',
        type: 'Painting Quote',
        duration: '2:15',
        status: 'completed',
        outcome: 'lead_qualified',
        timestamp: '15 minutes ago',
        transcript: 'Interested in exterior painting. Provided quote for $3,500. Follow-up scheduled.',
        satisfaction: 4,
        isDemo: true
      }
    ])

    setUpcomingAppointments([
      {
        id: 1,
        customer: 'Emily Wilson',
        service: 'HVAC Maintenance',
        date: 'Today, 2:00 PM',
        duration: '2 hours',
        status: 'confirmed',
        address: '123 Main St, Anytown',
        isDemo: true
      },
      {
        id: 2,
        customer: 'Robert Brown',
        service: 'Exterior Painting',
        date: 'Tomorrow, 9:00 AM',
        duration: '8 hours',
        status: 'confirmed',
        address: '456 Oak Ave, Anytown',
        isDemo: true
      }
    ])

    setLiveFeed([
      {
        id: 1,
        type: 'call_started',
        message: 'Incoming call from John Smith',
        timestamp: 'Just now',
        icon: Phone,
        color: 'text-green-400',
        isDemo: true
      },
      {
        id: 2,
        type: 'appointment_booked',
        message: 'New appointment scheduled for Emily Wilson',
        timestamp: '2 min ago',
        icon: Calendar,
        color: 'text-blue-400',
        isDemo: true
      },
      {
        id: 3,
        type: 'payment_received',
        message: 'Payment received: $2,500 from Robert Brown',
        timestamp: '5 min ago',
        icon: DollarSign,
        color: 'text-green-400',
        isDemo: true
      }
    ])
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
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CloudGreet</h1>
                <p className="text-xs text-gray-400 font-medium">AI RECEPTIONIST</p>
              </div>
              
              <div className="flex items-center space-x-3 ml-8">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                  isDemoMode 
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                    : isLive 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isDemoMode ? 'bg-orange-400' : isLive ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                  <span>{isDemoMode ? 'Demo' : isLive ? 'Live' : 'Offline'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <Bell className="w-5 h-5 text-gray-300" />
              </button>
              
              <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <Settings className="w-5 h-5 text-gray-300" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-sm font-bold">JD</span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-gray-400">Business Owner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="mb-8 bg-orange-500/10 border border-orange-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Demo Mode Active</h3>
                  <p className="text-orange-200">Complete setup to connect your real phone number and start receiving calls.</p>
                </div>
              </div>
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
              >
                Complete Setup
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
            <p className="text-gray-400">{isDemoMode ? 'Demo data and analytics' : 'Real-time insights and analytics'}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {['24h', '7d', '30d', '90d'].map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              change: "+23%",
              changeType: "positive",
              color: "text-blue-400"
            },
            {
              icon: DollarSign,
              label: "Revenue",
              value: `$${dashboardData.totalRevenue.toLocaleString()}`,
              change: "+34%",
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
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-gray-800">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'calls', label: 'Calls', icon: Phone },
              { id: 'appointments', label: 'Appointments', icon: Calendar },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'settings', label: 'Settings', icon: Settings }
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
                      <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {liveFeed.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-gray-700">
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">{item.message}</p>
                            <p className="text-gray-400 text-sm">{item.timestamp}</p>
                          </div>
                          {item.isDemo && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400">
                              Demo
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
                    <div className="space-y-3">
                      {[
                        { icon: Phone, label: 'Test AI Agent', action: () => {/* Test AI Agent */} },
                        { icon: Calendar, label: 'Schedule Appointment', action: () => {/* Schedule Appointment */} },
                        { icon: MessageSquare, label: 'Send Follow-up', action: () => {/* Send Follow-up */} },
                        { icon: BarChart3, label: 'View Reports', action: () => {/* View Reports */} },
                        { icon: Settings, label: 'Configure Settings', action: () => setSelectedTab('settings') }
                      ].map((action, index) => (
                        <button
                          key={index}
                          onClick={action.action}
                          className="w-full flex items-center space-x-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
                        >
                          <div className="p-2 rounded-lg bg-gray-700">
                            <action.icon className="w-4 h-4 text-gray-300" />
                          </div>
                          <span className="text-white font-medium">{action.label}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Calls */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white flex items-center">
                        <Phone className="w-5 h-5 mr-2 text-blue-400" />
                        Recent Calls
                      </h3>
                      <button className="text-sm text-blue-400 hover:text-blue-300">
                        View All
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {recentCalls.map((call, index) => (
                        <div
                          key={call.id}
                          className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h4 className="text-white font-semibold">{call.customer}</h4>
                                <p className="text-gray-400 text-sm">{call.phone} • {call.type}</p>
                                <p className="text-gray-500 text-xs mt-1 line-clamp-1">{call.transcript}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  call.outcome === 'appointment_booked' ? 'bg-green-500/20 text-green-400' :
                                  call.outcome === 'lead_qualified' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {call.outcome.replace('_', ' ')}
                                </span>
                                <div className="flex items-center space-x-1">
                                  {[...Array(5)].map((_, i) => (
                                    <StarIcon 
                                      key={i} 
                                      className={`w-3 h-3 ${i < call.satisfaction ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-gray-400 text-sm">{call.duration}</p>
                              <p className="text-gray-500 text-xs">{call.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Upcoming Appointments */}
                <div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-green-400" />
                        Upcoming Appointments
                      </h3>
                      <button className="text-sm text-green-400 hover:text-green-300">
                        View Calendar
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {upcomingAppointments.map((appointment, index) => (
                        <div
                          key={appointment.id}
                          className="p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-semibold">{appointment.customer}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              appointment.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {appointment.status}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-1">{appointment.service}</p>
                          <p className="text-gray-400 text-sm mb-1">{appointment.date}</p>
                          <p className="text-gray-500 text-xs">{appointment.address}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {appointment.duration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'calls' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Call Management</h3>
                <p className="text-gray-400">Advanced call logs, transcripts, and analytics coming soon...</p>
              </div>
            )}

            {selectedTab === 'appointments' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Appointments</h3>
                <p className="text-gray-400">Calendar integration and appointment management coming soon...</p>
              </div>
            )}

            {selectedTab === 'analytics' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Analytics</h3>
                <p className="text-gray-400">Detailed performance metrics and insights coming soon...</p>
              </div>
            )}

            {selectedTab === 'settings' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Settings</h3>
                <p className="text-gray-400">AI agent configuration and business settings coming soon...</p>
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
          setIsDemoMode(false)
          setIsLive(true)
          // Clear demo status since onboarding is complete
          localStorage.removeItem('accountStatus')
          loadDashboardData()
        }}
      />
    </div>
  )
}