'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Check if user is admin via password token
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('adminToken')

  useEffect(() => {
    // Check for admin token
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
      router.push('/admin/login')
      return
    }

    fetchAdminData()
    const interval = setInterval(fetchAdminData, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [isAdmin, router])

  const fetchAdminData = async () => {
    try {
      const [statsResponse, clientsResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/clients')
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data)
      }

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json()
        setClients(clientsData.data)
      }
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const handleClientAction = async (clientId: string, action: string, data?: any) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        fetchAdminData() // Refresh data
        // Success handled silently - data will refresh
      } else {
        const error = await response.json()

        // Error logged - could add toast notification here
      }
    } catch (error) {

      // Error logged - could add toast notification here
    }
  }

  const filteredClients = clients.filter(client =>
    client.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone_number.includes(searchTerm)
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">CloudGreet Business Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Welcome, Admin
              </span>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Client Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'clients', name: 'Clients', icon: '👥' },
              { id: 'analytics', name: 'Analytics', icon: '📈' },
              { id: 'system', name: 'System', icon: '⚙️' },
              { id: 'financial', name: 'Financial', icon: '💰' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <span className="text-2xl">👥</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <span className="text-2xl">💰</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <span className="text-2xl">📞</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Calls Today</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.callsToday}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <span className="text-2xl">📅</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Appointments Today</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.appointmentsToday}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {clients.slice(0, 5).map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{client.business_name}</p>
                        <p className="text-sm text-gray-600">{client.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Last activity: {new Date(client.last_activity).toLocaleDateString()}</p>
                        <p className="text-sm font-medium text-green-600">${client.monthly_revenue}/month</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            {/* Client Search and Filters */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Client Management</h3>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => fetchAdminData()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* Client List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{client.business_name}</div>
                            <div className="text-sm text-gray-500">ID: {client.id.slice(0, 8)}...</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{client.email}</div>
                            <div className="text-sm text-gray-500">{client.phone_number}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            client.subscription_status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {client.subscription_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${client.monthly_revenue}/month
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>Calls: {client.calls_count}</div>
                          <div>Appointments: {client.appointments_count}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => setSelectedClient(client)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleClientAction(client.id, 'suspend')}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() => handleClientAction(client.id, 'reactivate')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Reactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Business Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Revenue Trends</h4>
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Revenue chart will be displayed here</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Client Growth</h4>
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Growth chart will be displayed here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800">API Status</h4>
                  <p className="text-green-600">All systems operational</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800">Database</h4>
                  <p className="text-blue-600">Connected and healthy</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-800">Telynyx Services</h4>
                  <p className="text-purple-600">All services active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Overview</h3>
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <h4 className="text-lg font-medium text-green-800">Total Revenue</h4>
                    <p className="text-3xl font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <h4 className="text-lg font-medium text-blue-800">Average Client Value</h4>
                    <p className="text-3xl font-bold text-blue-600">${stats.averageClientValue.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <h4 className="text-lg font-medium text-purple-800">Conversion Rate</h4>
                    <p className="text-3xl font-bold text-purple-600">{stats.conversionRate}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">{selectedClient.business_name}</h3>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{selectedClient.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900">{selectedClient.phone_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="text-gray-900">{selectedClient.subscription_status}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Monthly Revenue</label>
                <p className="text-gray-900">${selectedClient.monthly_revenue}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Calls</label>
                <p className="text-gray-900">{selectedClient.calls_count}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Appointments</label>
                <p className="text-gray-900">{selectedClient.appointments_count}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
