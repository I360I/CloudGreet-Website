"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Phone, 
  Calendar, 
  MessageSquare,
  Settings,
  BarChart3,
  Activity,
  Shield,
  Zap,
  Brain,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Crown,
  Target,
  Rocket,
  Database,
  Server,
  Globe,
  Lock,
  Bell,
  Mail,
  User,
  LogOut,
  X
} from 'lucide-react'
import AdminCharts from '../components/AdminCharts'
import SystemManagement from '../components/SystemManagement'
import RevenueAnalytics from '../components/RevenueAnalytics'

interface AdminStats {
  totalClients: number
  activeClients: number
  monthlyRevenue: number
  totalRevenue: number
  averageClientValue: number
  conversionRate: number
  callsToday: number
  appointmentsToday: number
  smsSent: number
  systemHealth: string
}

interface Client {
  id: string
  business_name: string
  email: string
  phone_number: string
  created_at: string
  subscription_status: string
  monthly_revenue: number
  calls_count: number
  appointments_count: number
  last_activity: string
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<AdminStats>({
    totalClients: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    averageClientValue: 0,
    conversionRate: 0,
    callsToday: 0,
    appointmentsToday: 0,
    smsSent: 0,
    systemHealth: 'excellent'
  })
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    // Check admin authentication
    const checkAdmin = () => {
      const adminToken = localStorage.getItem('admin_token')
      if (adminToken === 'authenticated') {
        setIsAdmin(true)
        fetchAdminData()
      } else {
        window.location.href = '/admin/login'
      }
    }

    checkAdmin()
  }, [])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch stats and clients in parallel
      const [statsResponse, clientsResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/clients')
      ])

      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch stats: ${statsResponse.status}`)
      }

      if (!clientsResponse.ok) {
        throw new Error(`Failed to fetch clients: ${clientsResponse.status}`)
      }

      const statsData = await statsResponse.json()
      const clientsData = await clientsResponse.json()

      // Handle both response formats
      if (statsData.success && statsData.data) {
        setStats(statsData.data)
      } else if (statsData.totalClients !== undefined) {
        setStats(statsData)
      }

      if (clientsData.success && clientsData.data) {
        setClients(clientsData.data)
      } else if (clientsData.clients) {
        setClients(clientsData.clients)
      }
    } catch (error) {
      // Error fetching admin data
      setError(error instanceof Error ? error.message : 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client =>
    client.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 hover:bg-gray-800/70"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-500', '-500/20')} border border-gray-700/50`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center text-sm">
          <TrendingUp className="w-4 h-4 text-emerald-400 mr-1" />
          <span className="text-emerald-400">{trend}</span>
        </div>
      )}
    </motion.div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'system', label: 'System', icon: Settings },
    { id: 'revenue', label: 'Revenue', icon: DollarSign }
  ]

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Navigation */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <div className="w-5 h-5 flex flex-col justify-center space-y-1">
                  <div className="w-full h-0.5 bg-white"></div>
                  <div className="w-full h-0.5 bg-white"></div>
                  <div className="w-full h-0.5 bg-white"></div>
                </div>
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  CloudGreet Admin
                </h1>
                <p className="text-gray-400 text-sm">Welcome back, Anthony</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-700/50 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">System Online</span>
              </div>
              <button
                onClick={fetchAdminData}
                className="flex items-center px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors border border-purple-500/30"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('admin_token')
                  window.location.href = '/admin/login'
                }}
                className="flex items-center px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors border border-red-500/30"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-800/30 backdrop-blur-sm border-r border-gray-700/50 min-h-screen"
            >
              <div className="p-6">
                <div className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      <tab.icon className="w-5 h-5 mr-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="mt-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => {
                        setActiveTab('clients')
                        // Scroll to add client button in clients tab
                        setTimeout(() => {
                          const addButton = document.querySelector('[data-add-client]')
                          if (addButton) {
                            addButton.scrollIntoView({ behavior: 'smooth' })
                          }
                        }, 100)
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-3" />
                      Add Client
                    </button>
                    <button 
                      onClick={() => {
                        const dataStr = JSON.stringify(clients, null, 2)
                        const dataBlob = new Blob([dataStr], {type: 'application/json'})
                        const url = URL.createObjectURL(dataBlob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = 'clients-export.json'
                        link.click()
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4 mr-3" />
                      Export Data
                    </button>
                    <button 
                      onClick={() => {
                        alert('Notifications feature coming soon!')
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <Bell className="w-4 h-4 mr-3" />
                      Notifications
                    </button>
                  </div>
                </div>

                {/* System Status */}
                <div className="mt-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    System Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Database</span>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                        <span className="text-xs text-emerald-400">Online</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">API</span>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
                        <span className="text-xs text-emerald-400">Healthy</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">AI Assistant</span>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                        <span className="text-xs text-gray-400">Disabled</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-300">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              <span className="ml-3 text-gray-400">Loading admin data...</span>
            </div>
          )}

          {/* Overview Tab */}
          {!loading && activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Welcome back, Anthony! 👋</h2>
                    <p className="text-gray-300">Here's what's happening with your CloudGreet business today.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Last updated</p>
                    <p className="text-sm text-gray-300">{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Clients"
                  value={stats.totalClients}
                  icon={Users}
                  color="text-blue-400"
                  subtitle="Active businesses"
                />
                <StatCard
                  title="Monthly Revenue"
                  value={`$${stats.monthlyRevenue.toLocaleString()}`}
                  icon={DollarSign}
                  color="text-emerald-400"
                  subtitle="Recurring revenue"
                />
                <StatCard
                  title="Calls Today"
                  value={stats.callsToday}
                  icon={Phone}
                  color="text-purple-400"
                  subtitle="AI handled calls"
                />
                <StatCard
                  title="System Health"
                  value="100%"
                  icon={Shield}
                  color="text-emerald-400"
                  subtitle="All systems operational"
                />
              </div>

              {/* Activity Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-purple-400" />
                    Today's Activity
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 text-blue-400 mr-3" />
                        <span className="text-gray-300">Calls Processed</span>
                      </div>
                      <span className="font-semibold text-white">{stats.callsToday}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-emerald-400 mr-3" />
                        <span className="text-gray-300">Appointments Booked</span>
                      </div>
                      <span className="font-semibold text-white">{stats.appointmentsToday}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageSquare className="w-5 h-5 text-purple-400 mr-3" />
                        <span className="text-gray-300">SMS Messages</span>
                      </div>
                      <span className="font-semibold text-white">{stats.smsSent}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-emerald-400" />
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Conversion Rate</span>
                      <span className="font-semibold text-white">{stats.conversionRate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Avg Client Value</span>
                      <span className="font-semibold text-white">${stats.averageClientValue}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Total Revenue</span>
                      <span className="font-semibold text-white">${stats.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Client Management Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Client Management</h2>
                  <p className="text-gray-400">Manage your business clients and their data</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                    />
                  </div>
                  <button 
                    data-add-client
                    onClick={async () => {
                      // Add real client functionality
                      const businessName = prompt('Enter business name:')
                      const email = prompt('Enter email:')
                      const phone = prompt('Enter phone number:')
                      
                      if (businessName && email && phone) {
                        try {
                          const response = await fetch('/api/admin/clients', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              business_name: businessName,
                              email: email,
                              phone_number: phone
                            })
                          })
                          
                          if (response.ok) {
                            const result = await response.json()
                            setClients(prev => [result.client, ...prev])
                            alert('Client added successfully!')
                          } else {
                            alert('Unable to add client. Please try again.')
                          }
                        } catch (error) {
                          // Error adding client
                          alert('Unable to add client. Please try again.')
                        }
                      }
                    }}
                    className="flex items-center px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors border border-purple-500/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </button>
                </div>
              </div>

              {/* Clients Table */}
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                {filteredClients.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">No clients found</h3>
                    <p className="text-gray-500 mb-6">
                      {searchTerm ? 'No clients match your search criteria.' : 'Get started by adding your first client.'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => {
                          const businessName = prompt('Enter business name:')
                          const email = prompt('Enter email:')
                          const phone = prompt('Enter phone number:')
                          
                          if (businessName && email && phone) {
                            // Add client logic here
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Client
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700/50">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Business
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Activity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                        {filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">{client.business_name}</div>
                              <div className="text-sm text-gray-400">ID: {client.id.slice(0, 8)}...</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-300">{client.email}</div>
                              <div className="text-sm text-gray-400">{client.phone_number}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              client.subscription_status === 'active' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {client.subscription_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            ${client.monthly_revenue.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {client.last_activity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedClient(client)}
                                className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/20 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  // Edit client functionality
                                  const newName = prompt('Enter new business name:', client.business_name)
                                  const newEmail = prompt('Enter new email:', client.email)
                                  const newPhone = prompt('Enter new phone:', client.phone_number)
                                  
                                  if (newName && newEmail && newPhone) {
                                    try {
                                      const response = await fetch('/api/admin/clients', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          id: client.id,
                                          business_name: newName,
                                          email: newEmail,
                                          phone_number: newPhone,
                                          subscription_status: client.subscription_status
                                        })
                                      })
                                      
                                      if (response.ok) {
                                        setClients(prev => prev.map(c => 
                                          c.id === client.id ? { ...c, business_name: newName, email: newEmail, phone_number: newPhone } : c
                                        ))
                                        alert('Client updated successfully!')
                                      } else {
                                        alert('Unable to update client. Please try again.')
                                      }
                                    } catch (error) {
                                      // Error updating client
                                      alert('Unable to update client. Please try again.')
                                    }
                                  }
                                }}
                                className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-emerald-500/20 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  // Delete client functionality
                                  if (confirm(`Are you sure you want to delete ${client.business_name}?`)) {
                                    try {
                                      const response = await fetch(`/api/admin/clients?id=${client.id}`, {
                                        method: 'DELETE'
                                      })
                                      
                                      if (response.ok) {
                                        setClients(prev => prev.filter(c => c.id !== client.id))
                                        alert('Client deleted successfully!')
                                      } else {
                                        alert('Unable to delete client. Please try again.')
                                      }
                                    } catch (error) {
                                      // Error deleting client
                                      alert('Unable to delete client. Please try again.')
                                    }
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20 transition-colors"
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
                )}
              </div>
            </motion.div>
          )}

          {/* Analytics tab */}
          {activeTab === 'analytics' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AdminCharts stats={stats} clients={clients} />
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <SystemManagement />
            </motion.div>
          )}

          {activeTab === 'revenue' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <RevenueAnalytics />
            </motion.div>
          )}
        </div>
      </div>


      {/* Client Detail Modal */}
      <AnimatePresence>
        {selectedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedClient(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">{selectedClient.business_name}</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-400">Email</label>
                  <p className="text-white">{selectedClient.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Phone</label>
                  <p className="text-white">{selectedClient.phone_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Status</label>
                  <p className="text-white">{selectedClient.subscription_status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Monthly Revenue</label>
                  <p className="text-white">${selectedClient.monthly_revenue.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <button 
                  onClick={async () => {
                    const message = prompt(`Send message to ${selectedClient.business_name}:`)
                    if (message) {
                      try {
                        const response = await fetch('/api/admin/message-client', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            clientId: selectedClient.id,
                            message: message
                          })
                        })
                        
                        if (response.ok) {
                          alert('Message sent successfully!')
                        } else {
                          alert('Unable to send message. Please try again.')
                        }
                      } catch (error) {
                        // Error sending message
                        alert('Unable to send message. Please try again.')
                      }
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Send Message
                </button>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}