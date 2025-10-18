"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, Eye, EyeOff, ArrowRight, Crown, Users, Phone, DollarSign, 
  BarChart3, Settings, LogOut, Activity, Database, Target, TrendingUp,
  Zap, DollarSign as Money, UserPlus, Mail, MessageSquare, Calendar,
  CheckCircle, AlertTriangle, Clock, RefreshCw, Play, Pause
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RealStats {
  totalClients: number
  monthlyRevenue: number
  totalRevenue: number
  conversionRate: number
  totalLeads: number
  activeCampaigns: number
  systemHealth: number
  lastClientAdded: string
  topPerformingCampaign: string
}

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'stopped'
  leadsGenerated: number
  conversions: number
  revenue: number
  cost: number
  roi: number
}

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<RealStats>({
    totalClients: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    conversionRate: 0,
    totalLeads: 0,
    activeCampaigns: 0,
    systemHealth: 98,
    lastClientAdded: '',
    topPerformingCampaign: ''
  })
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      setIsAuthenticated(true)
      loadRealMoneyData()
    }
  }, [])

  const loadRealMoneyData = async () => {
    setLoadingStats(true)
    try {
      // Load REAL revenue and client data - NO FAKE DATA
      const [statsResponse, leadsResponse, clientsResponse] = await Promise.all([
        fetch('/api/admin/real-revenue', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        }),
        fetch('/api/apollo-killer/leads', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        }),
        fetch('/api/admin/clients', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        })
      ])

      let realStats: RealStats = {
        totalClients: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        conversionRate: 0,
        totalLeads: 0,
        activeCampaigns: 0,
        systemHealth: 98,
        lastClientAdded: '',
        topPerformingCampaign: ''
      }

      // Load REAL revenue data from Stripe
      if (statsResponse.ok) {
        const revenueData = await statsResponse.json()
        if (revenueData.success) {
          realStats.monthlyRevenue = revenueData.data.monthlyRevenue || 0
          realStats.totalRevenue = revenueData.data.totalRevenue || 0
          realStats.totalClients = revenueData.data.totalClients || 0
          realStats.conversionRate = revenueData.data.conversionRate || 0
        } else {
          // If Stripe not configured, show 0 instead of fake data
          realStats.monthlyRevenue = 0
          realStats.totalRevenue = 0
          realStats.totalClients = 0
          realStats.conversionRate = 0
        }
      }

      // Load real leads data
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json()
        realStats.totalLeads = leadsData.leads?.length || 0
      }

      // Load real client data
      if (clientsResponse.ok) {
      const clientsData = await clientsResponse.json()
        realStats.totalClients = clientsData.clients?.length || 0
      }

      setStats(realStats)
    } catch (error) {
      console.error('Failed to load real money data:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth', {
                            method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
                            body: JSON.stringify({
          password,
          email: 'admin@cloudgreet.com'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('admin_token', data.token)
        setIsAuthenticated(true)
        loadRealMoneyData()
                          } else {
        setError(data.message || 'Invalid access credentials')
      }
    } catch (err) {
      setError('Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
    setPassword('')
    setError('')
    router.push('/admin')
  }

  const startRealSMSAutomation = async () => {
    try {
      // Get a lead to send real SMS to
      const leadsResponse = await fetch('/api/apollo-killer/leads', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })

      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json()
        const firstLead = leadsData.leads?.[0]
        
        if (firstLead) {
          // Send REAL SMS to the lead
          const smsResponse = await fetch('/api/admin/real-sms-automation', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
              'Content-Type': 'application/json'
            },
                                        body: JSON.stringify({
              leadId: firstLead.id,
              message: `Hi ${firstLead.business_name}, I'm reaching out about your ${firstLead.business_type} business. Would you be interested in learning about our AI receptionist service that can handle your calls 24/7?`,
              campaignId: 'real-automation'
            })
          })

          if (smsResponse.ok) {
            alert('✅ Real SMS sent successfully! Check your Telnyx dashboard.')
            loadRealMoneyData() // Refresh data
                                      } else {
            alert('❌ Failed to send SMS. Check Telnyx configuration.')
          }
                                      } else {
          alert('❌ No leads found to send SMS to.')
        }
                                      }
                                    } catch (error) {
      console.error('Failed to send real SMS:', error)
      alert('❌ SMS automation failed. Check configuration.')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-black to-gray-900/50"></div>
                            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-4 shadow-2xl"
            >
              <Crown className="w-8 h-8 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              MONEY MAKER DASHBOARD
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-sm"
            >
              Real Revenue • Real Clients • Real Automation
            </motion.p>
              </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-xl p-8 shadow-2xl"
          >
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-green-300 mb-2">
                  ACCESS KEY:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/70 border border-green-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                    placeholder="Enter access key"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-400 hover:text-green-200"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
              </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    ACCESS MONEY SYSTEM <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
              </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900/50 backdrop-blur-xl border-b border-gray-800 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Money className="w-6 h-6 text-white" />
                  </div>
                    <div>
              <h1 className="text-2xl font-bold text-white">Money Maker Dashboard</h1>
              <p className="text-gray-400 text-sm">Real Revenue • Real Clients • Real Automation</p>
                    </div>
                    </div>
                    <button
            onClick={handleLogout}
            className="bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 hover:text-red-300 font-medium py-2 px-4 rounded-lg flex items-center transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
                    </button>
                  </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* REAL MONEY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
                    <div>
                <p className="text-gray-400 text-sm font-medium">Monthly Revenue</p>
                <p className="text-3xl font-bold text-white mt-2">
                  ${loadingStats ? '...' : stats.monthlyRevenue.toLocaleString()}
                </p>
                    </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Money className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
            <div className="mt-4 flex items-center text-green-400 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Real money earned this month</span>
                </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
                    <div>
                <p className="text-gray-400 text-sm font-medium">Total Clients</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {loadingStats ? '...' : stats.totalClients}
                </p>
                    </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
            <div className="mt-4 flex items-center text-green-400 text-sm">
              <UserPlus className="w-4 h-4 mr-1" />
              <span>Real paying clients</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Campaigns</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {loadingStats ? '...' : stats.activeCampaigns}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
            <div className="mt-4 flex items-center text-green-400 text-sm">
              <Activity className="w-4 h-4 mr-1" />
              <span>Making money 24/7</span>
                      </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300"
          >
                    <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Conversion Rate</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {loadingStats ? '...' : stats.conversionRate}%
                </p>
                      </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-cyan-400" />
                    </div>
                      </div>
            <div className="mt-4 flex items-center text-green-400 text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Leads converting to clients</span>
              </div>
            </motion.div>
      </div>

        {/* MONEY MAKING ACTIONS */}
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Money Making Actions</h3>
            <button
              onClick={startRealSMSAutomation}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Zap className="w-4 h-4 mr-2" />
              Send Real SMS
            </button>
                </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
              onClick={() => router.push('/admin/leads')}
              className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-green-500/50 text-white font-medium py-4 px-6 rounded-lg flex flex-col items-center transition-all duration-200 group"
            >
              <Target className="w-6 h-6 mb-2 text-green-400 group-hover:text-green-300" />
              <span>Manage Leads</span>
              <span className="text-xs text-gray-400 mt-1">Convert to clients</span>
                </button>
                <button
              onClick={() => router.push('/admin/apollo-killer')}
              className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-blue-500/50 text-white font-medium py-4 px-6 rounded-lg flex flex-col items-center transition-all duration-200 group"
            >
              <Zap className="w-6 h-6 mb-2 text-blue-400 group-hover:text-blue-300" />
              <span>Apollo Killer</span>
              <span className="text-xs text-gray-400 mt-1">Automated outreach</span>
            </button>
            <button 
              onClick={() => router.push('/admin/automation')}
              className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-purple-500/50 text-white font-medium py-4 px-6 rounded-lg flex flex-col items-center transition-all duration-200 group"
            >
              <Settings className="w-6 h-6 mb-2 text-purple-400 group-hover:text-purple-300" />
              <span>Automation</span>
              <span className="text-xs text-gray-400 mt-1">Set up workflows</span>
                </button>
              </div>
            </motion.div>

        {/* ACTIVE CAMPAIGNS */}
        {campaigns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl p-6"
          >
            <h3 className="text-xl font-bold text-white mb-6">Active Money-Making Campaigns</h3>
            <div className="space-y-4">
              {campaigns.slice(0, 3).map((campaign) => (
                <div key={campaign.id} className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      campaign.status === 'active' ? 'bg-green-400' : 
                      campaign.status === 'paused' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}></div>
                    <div>
                      <h4 className="text-white font-medium">{campaign.name}</h4>
                      <p className="text-gray-400 text-sm">
                        {campaign.leadsGenerated} leads • {campaign.conversions} conversions • ${campaign.revenue} revenue
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">${campaign.revenue}</p>
                    <p className="text-gray-400 text-sm">{campaign.roi}% ROI</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}