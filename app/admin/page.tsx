'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ErrorBoundary from '../components/ErrorBoundary'
import Toast, { ToastContainer } from '../components/Toast'
import {
  Users,
  TrendingUp,
  DollarSign,
  Phone,
  Calendar,
  Settings,
  Bell,
  Sun,
  Moon,
  RefreshCw,
  LogOut,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  BarChart3,
  Activity,
  Zap,
  Shield,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  Building2,
  Mail,
  Globe,
  CreditCard,
  PieChart,
  LineChart,
  Target,
  Award,
  Database,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Lock,
  Unlock,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  MoreHorizontal
} from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  company: string
  businessType: string
  phoneNumber: string
  status: 'active' | 'inactive' | 'suspended' | 'trial'
  subscriptionPlan: string
  monthlyRevenue: number
  totalCalls: number
  totalBookings: number
  conversionRate: number
  lastActive: string
  createdAt: string
  agentId?: string
  onboardingStatus: 'completed' | 'pending' | 'failed'
}

interface AdminStats {
  totalClients: number
  activeClients: number
  monthlyRevenue: number
  totalCalls: number
  totalBookings: number
  averageConversionRate: number
  newClientsThisMonth: number
  churnRate: number
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // State management
  const [isLoading, setIsLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('lastActive')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [toasts, setToasts] = useState<Array<{
    id: string
    title: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration?: number
    onClose: (id: string) => void
  }>>([])

  // Toast helpers
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info', duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { 
      id, 
      title: type.charAt(0).toUpperCase() + type.slice(1), 
      message, 
      type, 
      duration,
      onClose: removeToast
    }])
  }, [removeToast])

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    // Check if user is admin (you can modify this logic based on your admin system)
    if (session.user?.email !== 'admin@cloudgreet.com' && session.user?.email !== 'aedwards424242@gmail.com') {
      showToast('Access denied. Admin privileges required.', 'error')
      router.push('/dashboard')
      return
    }

    loadAdminData()
  }, [session, status, router, showToast])

  const loadAdminData = async () => {
    setIsLoading(true)
    try {
      // Load clients and admin stats
      const [clientsResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/clients'),
        fetch('/api/admin/stats')
      ])

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json()
        setClients(clientsData.clients || [])
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setAdminStats(statsData.stats)
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
      showToast('Failed to load admin data', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await loadAdminData()
      showToast('Data refreshed successfully!', 'success')
    } catch (error) {
      showToast('Failed to refresh data', 'error')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const handleClientAction = async (clientId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        showToast(`Client ${action} successful`, 'success')
        await loadAdminData()
      } else {
        showToast(`Failed to ${action} client`, 'error')
      }
    } catch (error) {
      showToast(`Error ${action}ing client`, 'error')
    }
  }

  const handleAddClient = async (clientData: any) => {
    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      })

      if (response.ok) {
        showToast('Client added successfully!', 'success')
        await loadAdminData()
      } else {
        showToast('Failed to add client', 'error')
      }
    } catch (error) {
      showToast('Error adding client', 'error')
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter
    
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    let aValue = a[sortBy as keyof Client]
    let bValue = b[sortBy as keyof Client]
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = (bValue as string).toLowerCase()
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'}`}>
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -inset-10 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
          </div>
        </div>

        {/* Header */}
        <header className={`relative z-10 border-b transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/80 backdrop-blur-sm border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Admin Dashboard
                  </h1>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <button
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => router.push('/dashboard')}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    isDarkMode 
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2 inline" />
                  Client View
                </button>

                <button
                  onClick={() => router.push('/api/auth/signout')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4 mr-2 inline" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          {adminStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Total Clients</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {adminStats.totalClients}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    +{adminStats.newClientsThisMonth} this month
                  </span>
                </div>
              </div>

              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Monthly Revenue</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      ${adminStats.monthlyRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    +12.5% from last month
                  </span>
                </div>
              </div>

              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Total Calls</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {adminStats.totalCalls.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    +8.2% from last month
                  </span>
                </div>
              </div>

              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>Conversion Rate</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {adminStats.averageConversionRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    +2.1% from last month
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className={`mb-6 rounded-xl shadow-lg transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'clients', label: 'Clients', icon: Users },
                { id: 'analytics', label: 'Analytics', icon: Activity },
                { id: 'system', label: 'System', icon: Server }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {[
                    { type: 'client', message: 'New client "ABC Plumbing" signed up', time: '2 hours ago', icon: UserPlus, color: 'green' },
                    { type: 'call', message: 'High call volume detected for "XYZ HVAC"', time: '4 hours ago', icon: Phone, color: 'blue' },
                    { type: 'payment', message: 'Payment received from "123 Electric"', time: '6 hours ago', icon: DollarSign, color: 'green' },
                    { type: 'system', message: 'System maintenance completed', time: '1 day ago', icon: Settings, color: 'gray' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.color === 'green' ? 'bg-green-100 dark:bg-green-900/20' :
                        activity.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <activity.icon className={`w-4 h-4 ${
                          activity.color === 'green' ? 'text-green-600 dark:text-green-400' :
                          activity.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowAddClientModal(true)}
                    className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-200 text-center"
                  >
                    <UserPlus className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Add Client</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-200 text-center"
                  >
                    <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">View Analytics</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('system')}
                    className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-200 text-center"
                  >
                    <Settings className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">System Settings</span>
                  </button>
                  
                  <button
                    onClick={refreshData}
                    className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-200 text-center"
                  >
                    <RefreshCw className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Refresh Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className={`rounded-xl shadow-lg transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              {/* Client Management Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Client Management
                  </h3>
                  <button
                    onClick={() => setShowAddClientModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </button>
                </div>

                {/* Filters and Search */}
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="trial">Trial</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="lastActive">Last Active</option>
                    <option value="name">Name</option>
                    <option value="company">Company</option>
                    <option value="monthlyRevenue">Revenue</option>
                    <option value="totalCalls">Total Calls</option>
                  </select>

                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className={`px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300' 
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Clients Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`border-b border-gray-200 dark:border-gray-700 ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Calls
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Conversion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {client.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {client.company}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            client.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            client.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                            client.status === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          ${client.monthlyRevenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {client.totalCalls.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {client.conversionRate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(client.lastActive).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedClient(client)
                                setShowClientModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleClientAction(client.id, 'suspend')}
                              className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleClientAction(client.id, 'delete')}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart Placeholder */}
              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Revenue Trends
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <LineChart className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Chart visualization coming soon</p>
                  </div>
                </div>
              </div>

              {/* Client Growth Chart Placeholder */}
              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Client Growth
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Chart visualization coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Status */}
              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  System Status
                </h3>
                <div className="space-y-4">
                  {[
                    { name: 'API Server', status: 'online', icon: Server },
                    { name: 'Database', status: 'online', icon: Database },
                    { name: 'Email Service', status: 'online', icon: Mail },
                    { name: 'Payment Gateway', status: 'online', icon: CreditCard }
                  ].map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <service.icon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-900 dark:text-white">{service.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600 dark:text-green-400 capitalize">{service.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Metrics */}
              <div className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  System Metrics
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</span>
                    <span className="text-sm text-gray-900 dark:text-white">23%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</span>
                    <span className="text-sm text-gray-900 dark:text-white">67%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Disk Usage</span>
                    <span className="text-sm text-gray-900 dark:text-white">45%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Network I/O</span>
                    <span className="text-sm text-gray-900 dark:text-white">12 MB/s</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Modals */}
        {showClientModal && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Client Details</h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> {selectedClient.name}</p>
                <p><strong>Email:</strong> {selectedClient.email}</p>
                <p><strong>Business:</strong> {(selectedClient as any).businessName || 'N/A'}</p>
                <p><strong>Status:</strong> {selectedClient.status}</p>
              </div>
              <button
                onClick={() => {
                  setShowClientModal(false)
                  setSelectedClient(null)
                }}
                className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showAddClientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add New Client</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Client Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  placeholder="Business Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle add client logic
                    setShowAddClientModal(false)
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Client
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </ErrorBoundary>
  )
}