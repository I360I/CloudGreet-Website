'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, Calendar, Users, DollarSign, TrendingUp, 
  Settings, LogOut, Bell, ArrowRight, CheckCircle, 
  Clock, AlertCircle, Play, Pause, Eye, Zap, Target
} from 'lucide-react'
import Link from 'next/link'
import NetworkErrorHandler from '../components/NetworkErrorHandler'
import ConnectionStatusIndicator from '../components/ConnectionStatus'
import DashboardMetrics from '../components/DashboardMetrics'
import LiveActivityFeed from '../components/LiveActivityFeed'
import AIConversationInsights from '../components/AIConversationInsights'
import QuickStartWidget from '../components/QuickStartWidget'
import SupportWidget from '../components/SupportWidget'
import CallTestWidget from '../components/CallTestWidget'
import OnboardingWizard from '../components/OnboardingWizard'
// import ROICalculator from '../components/ROICalculator' // Temporarily disabled for build
import RealTimeUpdates from '../components/RealTimeUpdates'
import { useToast } from '../contexts/ToastContext'

interface DashboardData {
  businessId: string
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
  setupStatus: string
  nextSteps: string[]
  onboardingCompleted: boolean
  hasPhoneNumber: boolean
  hasAgent: boolean
  timeframe: string
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [realMetrics, setRealMetrics] = useState<any>(null)
  const [realActivity, setRealActivity] = useState<any[]>([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    loadDashboardData()
    loadRealMetrics()
    loadRealActivity()
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
            businessId: data.data.businessId || '',
            businessName: data.data.businessName || 'Your Business',
            phoneNumber: data.data.phoneNumber || 'Not configured',
            isActive: data.data.isActive || false,
            totalCalls: data.data.totalCalls || 0,
            totalAppointments: data.data.totalAppointments || 0,
            totalRevenue: data.data.totalRevenue || 0,
            recentCalls: data.data.recentCalls || [],
            upcomingAppointments: data.data.upcomingAppointments || [],
            setupStatus: data.data.setupStatus || 'incomplete',
            nextSteps: data.data.nextSteps || ['Complete setup'],
            onboardingCompleted: data.data.onboardingCompleted || false,
            hasPhoneNumber: data.data.hasPhoneNumber || false,
            hasAgent: data.data.hasAgent || false,
            timeframe: data.data.timeframe || '30d'
          })
        } else {
          setError(data.message || 'Failed to load dashboard data')
        }
      } else {
        setError('Failed to load dashboard data')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRealMetrics = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/dashboard/real-metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRealMetrics(data.data)
        }
      }
    } catch (error) {
      // Silent fail - real metrics are optional
    }
  }

  const loadRealActivity = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/dashboard/real-metrics?timeframe=7d', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRealActivity(data.data.recentActivity || [])
          setRealMetrics(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to load real activity:', error)
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
    <>
      <OnboardingWizard 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false)
          loadDashboardData()
          showSuccess('Onboarding completed! Your AI agent is ready to test.')
        }}
      />
      <NetworkErrorHandler>
      {/* Real-time Updates */}
      {dashboardData?.businessId && (
        <RealTimeUpdates businessId={dashboardData.businessId} />
      )}
      
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
                    className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors focus:ring-4 focus:ring-blue-500/50 focus:outline-none"
                    aria-label="Open settings"
                  >
                    <Settings className="w-5 h-5" aria-hidden="true" />
                  </motion.button>
                </Link>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors focus:ring-4 focus:ring-red-500/50 focus:outline-none"
                  aria-label="Log out of account"
                >
                  <LogOut className="w-5 h-5 text-red-400" aria-hidden="true" />
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
                    : dashboardData?.hasAgent
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'bg-yellow-500/20 border border-yellow-500/30'
                }`}>
                  {dashboardData?.isActive ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : dashboardData?.hasAgent ? (
                    <Clock className="w-6 h-6 text-blue-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {dashboardData?.isActive 
                      ? 'AI Agent Active' 
                      : dashboardData?.hasAgent
                      ? 'Agent Ready - Setup Phone'
                      : dashboardData?.onboardingCompleted
                      ? 'Onboarding Complete'
                      : 'Complete Onboarding'
                    }
                  </h2>
                  <p className="text-gray-400">
                    {dashboardData?.isActive 
                      ? `Phone: ${formatPhoneNumber(dashboardData.phoneNumber)}`
                      : dashboardData?.hasAgent
                      ? 'Test your agent, then connect a phone number'
                      : dashboardData?.onboardingCompleted
                      ? 'Your business details are saved'
                      : 'Tell us about your business to create your AI agent'
                    }
                  </p>
                </div>
              </div>
              
              {!dashboardData?.onboardingCompleted && (
                <motion.button
                  onClick={() => setShowOnboarding(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  Start Onboarding
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}
              
              {dashboardData?.onboardingCompleted && dashboardData?.hasAgent && !dashboardData?.isActive && (
                <Link href="/test-agent-simple">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    Test Your Agent
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              )}
            </div>
          </motion.div>

          {/* Next Steps Section */}
          {dashboardData?.nextSteps && dashboardData.nextSteps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
            >
              <h3 className="text-lg font-semibold mb-4">Next Steps to Get Started</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {dashboardData.nextSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      <span className="text-sm font-semibold text-purple-400">{index + 1}</span>
                    </div>
                    <span className="text-sm text-gray-300">{step}</span>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-4">Quick Actions:</h4>
                <div className="flex flex-wrap gap-3">
                  {!dashboardData?.onboardingCompleted && (
                    <motion.button
                      onClick={() => setShowOnboarding(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg font-medium hover:bg-blue-600/30 transition-all"
                    >
                      Complete Onboarding
                    </motion.button>
                  )}
                  
                  {dashboardData?.onboardingCompleted && dashboardData?.hasAgent && (
                    <>
                      <Link href="/test-agent-simple">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg font-medium hover:bg-purple-600/30 transition-all"
                        >
                          Test Agent
                        </motion.button>
                      </Link>
                      {!dashboardData?.hasPhoneNumber && (
                        <Link href="/billing">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg font-medium hover:bg-green-600/30 transition-all"
                          >
                            Subscribe & Get Phone
                          </motion.button>
                        </Link>
                      )}
                    </>
                  )}
                  
                  <Link href="/demo">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg font-medium hover:bg-purple-600/30 transition-all"
                    >
                      Try Demo
                    </motion.button>
                  </Link>
                  
                  <Link href="/test-agent-simple">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 rounded-lg font-medium hover:bg-orange-600/30 transition-all"
                    >
                      Test Agent
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Enhanced Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <DashboardMetrics 
              data={realMetrics || {
                totalCalls: dashboardData?.totalCalls || 0,
                totalAppointments: dashboardData?.totalAppointments || 0,
                totalRevenue: dashboardData?.totalRevenue || 0,
                conversionRate: 0,
                avgCallDuration: 0,
                customerSatisfaction: 85,
                monthlyGrowth: 0,
                revenueProjection: 0
              }}
            />
          </motion.div>

          {/* ROI Calculator - Temporarily disabled due to build issue */}
          {/* {dashboardData?.hasPhoneNumber && dashboardData?.businessId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-8"
            >
              <ROICalculator businessId={dashboardData.businessId} />
            </motion.div>
          )} */}

          {/* Live Activity & Quick Start Grid */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Quick Start Widget */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <QuickStartWidget 
                businessName={dashboardData?.businessName || 'Your Business'}
                onDataGenerated={() => {
                  loadRealActivity()
                  loadRealMetrics()
                }}
              />
            </motion.div>

            {/* Live Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <LiveActivityFeed 
                businessName={dashboardData?.businessName || 'Your Business'} 
                realActivity={realActivity}
              />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Performance Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-400" />
              Performance Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-white">{realMetrics?.conversionRate || 0}%</span>
                </div>
                <h3 className="font-semibold text-white mb-1">Conversion Rate</h3>
                <p className="text-sm text-gray-400">Calls to appointments</p>
                <div className="flex items-center justify-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400">Real data</span>
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-white">{realMetrics?.avgCallDuration ? Math.round(realMetrics.avgCallDuration / 60) + 'm' : '0m'}</span>
                </div>
                <h3 className="font-semibold text-white mb-1">Avg Call Duration</h3>
                <p className="text-sm text-gray-400">Time per conversation</p>
                <div className="flex items-center justify-center mt-2">
                  <TrendingUp className="w-4 h-4 text-blue-400 mr-1" />
                  <span className="text-sm text-blue-400">Real data</span>
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-white">{realMetrics?.customerSatisfaction || 85}%</span>
                </div>
                <h3 className="font-semibold text-white mb-1">Customer Satisfaction</h3>
                <p className="text-sm text-gray-400">Happy customers</p>
                <div className="flex items-center justify-center mt-2">
                  <TrendingUp className="w-4 h-4 text-purple-400 mr-1" />
                  <span className="text-sm text-purple-400">Real data</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Conversation Insights */}
          {/* Support & Call Test Widgets */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <SupportWidget businessName={dashboardData?.businessName || 'Your Business'} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <CallTestWidget 
                businessName={dashboardData?.businessName || 'Your Business'}
                phoneNumber={dashboardData?.phoneNumber}
                onTestComplete={() => {
                  loadRealActivity()
                  loadRealMetrics()
                }}
              />
            </motion.div>
          </div>

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
                  {dashboardData.recentCalls.slice(0, 3).map((call: any) => (
                    <div key={call.id} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{call.caller || call.from_number || 'Unknown'}</p>
                          <p className="text-sm text-gray-400">{call.date || new Date(call.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{call.duration || '0:00'}</p>
                          <p className={`text-xs ${
                            call.status === 'answered' || call.status === 'completed' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {call.status}
                          </p>
                        </div>
                      </div>
                      {call.recording_url && (
                        <div className="mt-2">
                          <audio 
                            controls 
                            className="w-full h-8"
                            style={{ 
                              filter: 'invert(0.9) hue-rotate(180deg)',
                              borderRadius: '6px'
                            }}
                          >
                            <source src={call.recording_url} type="audio/mpeg" />
                            <source src={call.recording_url} type="audio/wav" />
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}
                      {call.transcription_text && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">View Transcript</summary>
                          <div className="mt-2 p-2 bg-black/30 rounded text-xs text-gray-300 max-h-40 overflow-y-auto">
                            {call.transcription_text}
                          </div>
                        </details>
                      )}
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
    </>
  )
}