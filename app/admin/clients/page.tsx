'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/Button'
import { logger } from '@/lib/monitoring'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

interface Client {
  id: string
  business_name: string
  email: string
  phone_number: string | null
  business_type: string | null
  subscription_status: string
  account_status: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  totalCalls: number
  totalAppointments: number
  lastCallDate: string | null
  lastAppointmentDate: string | null
}

interface ClientDetail {
  client: Client & {
    owner: {
      id: string
      email: string
      name: string
      phone: string | null
      created_at: string
      last_login: string | null
    }
  }
  activity: {
    calls: {
      total: number
      answered: number
      missed: number
      recent: Array<{
        id: string
        from_number: string
        to_number: string
        duration: number
        status: string
        created_at: string
      }>
    }
    appointments: {
      total: number
      completed: number
      recent: Array<{
        id: string
        customer_name: string
        service_type: string
        scheduled_date: string
        status: string
      }>
    }
    revenue: {
      total: number
    }
  }
  aiAgent: {
    id: string
    agent_name: string
    status: string
    retell_agent_id: string | null
    phone_number: string | null
  } | null
}

interface ClientsResponse {
  success: boolean
  clients: Client[]
  statistics: {
    total: number
    active: number
    inactive: number
    suspended: number
    cancelled: number
  }
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null)
  const [statistics, setStatistics] = useState<ClientsResponse['statistics']>({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    cancelled: 0
  })
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  // Fetch clients
  const fetchClients = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      params.append('limit', limit.toString())
      params.append('offset', ((currentPage - 1) * limit).toString())

      const response = await fetchWithAuth(`/api/admin/clients?${params.toString()}`)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to fetch clients (${response.status})`)
      }

      let data: ClientsResponse
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }
      
      if (data.success) {
        setClients(data.clients)
        setStatistics(data.statistics)
        setTotalPages(Math.ceil(data.pagination.total / limit))
      } else {
        throw new Error('Failed to fetch clients')
      }
    } catch (err) {
      logger.error('Error fetching clients', { error: err instanceof Error ? err.message : 'Unknown error' })
      setError(err instanceof Error ? err.message : 'Failed to fetch clients')
    } finally {
      setLoading(false)
    }
  }

  // Fetch client detail
  const fetchClientDetail = async (clientId: string) => {
    setDetailLoading(true)
    setSelectedClient(clientId)
    
    try {
      const response = await fetchWithAuth(`/api/admin/clients/${clientId}`)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to fetch client details (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }
      
      if (data.success) {
        setClientDetail(data)
      } else {
        throw new Error('Failed to fetch client details')
      }
    } catch (err) {
      logger.error('Error fetching client detail', { error: err instanceof Error ? err.message : 'Unknown error' })
      alert(err instanceof Error ? err.message : 'Failed to fetch client details')
      setSelectedClient(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [statusFilter, searchQuery, currentPage])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500/20 text-green-300 border border-green-500/30'
      case 'inactive': return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
      case 'suspended': return 'bg-red-500/20 text-red-300 border border-red-500/30'
      case 'cancelled': return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
    }
  }

  if (selectedClient && clientDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Button
                  onClick={() => {
                    setSelectedClient(null)
                    setClientDetail(null)
                  }}
                  variant="outline"
                  className="mb-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  ← Back to Clients
                </Button>
                <h1 className="text-3xl font-bold text-white">{clientDetail.client.business_name}</h1>
                <p className="text-gray-300 mt-2">Client Details & Activity</p>
              </div>
            </div>

        {/* Client Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Business Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-400">Business Name</div>
                <div className="text-lg font-medium text-white">{clientDetail.client.business_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Email</div>
                <div className="text-lg text-white">{clientDetail.client.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Phone</div>
                <div className="text-lg text-white">{clientDetail.client.phone_number || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Business Type</div>
                <div className="text-lg text-white">{clientDetail.client.business_type || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Status</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(clientDetail.client.subscription_status)}`}>
                  {clientDetail.client.subscription_status}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Owner Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-400">Name</div>
                <div className="text-lg font-medium text-white">{clientDetail.client.owner.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Email</div>
                <div className="text-lg text-white">{clientDetail.client.owner.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Phone</div>
                <div className="text-lg text-white">{clientDetail.client.owner.phone || 'Not set'}</div>
              </div>
              {clientDetail.client.owner.last_login && (
                <div>
                  <div className="text-sm text-gray-400">Last Login</div>
                  <div className="text-lg text-white">{new Date(clientDetail.client.owner.last_login).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
            <div className="text-sm text-gray-400">Total Calls</div>
            <div className="text-2xl font-bold text-white">{clientDetail.activity.calls.total}</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
            <div className="text-sm text-gray-400">Answered</div>
            <div className="text-2xl font-bold text-green-400">{clientDetail.activity.calls.answered}</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
            <div className="text-sm text-gray-400">Appointments</div>
            <div className="text-2xl font-bold text-white">{clientDetail.activity.appointments.total}</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
            <div className="text-sm text-gray-400">Total Revenue</div>
            <div className="text-2xl font-bold text-green-400">${clientDetail.activity.revenue.total.toLocaleString()}</div>
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Recent Calls</h2>
          {clientDetail.activity.calls.recent.length === 0 ? (
            <div className="text-center py-4 text-gray-400">No calls yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-gray-700/50">
                  {clientDetail.activity.calls.recent.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{call.from_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{call.to_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{call.duration}s</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{call.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{new Date(call.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Appointments */}
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Recent Appointments</h2>
          {clientDetail.activity.appointments.recent.length === 0 ? (
            <div className="text-center py-4 text-gray-400">No appointments yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-gray-700/50">
                  {clientDetail.activity.appointments.recent.map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{apt.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{apt.service_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{new Date(apt.scheduled_date).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{apt.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Agent Info */}
        {clientDetail.aiAgent && (
          <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">AI Agent</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-400">Agent Name</div>
                <div className="text-lg text-white">{clientDetail.aiAgent.agent_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Status</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(clientDetail.aiAgent.status)}`}>
                  {clientDetail.aiAgent.status}
                </span>
              </div>
              {clientDetail.aiAgent.phone_number && (
                <div>
                  <div className="text-sm text-gray-400">Phone Number</div>
                  <div className="text-lg text-white">{clientDetail.aiAgent.phone_number}</div>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Client Management</h1>
              <p className="text-gray-300 mt-2">
                View and manage all clients (businesses) on the platform.
              </p>
            </div>
          </div>

          {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
          <div className="text-sm font-medium text-gray-400 mb-1">Total</div>
          <div className="text-2xl font-bold text-white">{statistics.total}</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
          <div className="text-sm font-medium text-gray-400 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-400">{statistics.active}</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
          <div className="text-sm font-medium text-gray-400 mb-1">Inactive</div>
          <div className="text-2xl font-bold text-gray-300">{statistics.inactive}</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
          <div className="text-sm font-medium text-gray-400 mb-1">Suspended</div>
          <div className="text-2xl font-bold text-red-400">{statistics.suspended}</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
          <div className="text-sm font-medium text-gray-400 mb-1">Cancelled</div>
          <div className="text-2xl font-bold text-gray-300">{statistics.cancelled}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by business name, email, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-6">
        {loading ? (
          <div className="text-center py-8 text-gray-300">Loading clients...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No clients found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Calls
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Appointments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-gray-700/50">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{client.business_name}</div>
                        {client.business_type && (
                          <div className="text-sm text-gray-400">{client.business_type}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{client.email}</div>
                        {client.phone_number && (
                          <div className="text-sm text-gray-400">{client.phone_number}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.account_status)}`}>
                          {client.account_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {client.totalCalls}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {client.totalAppointments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => fetchClientDetail(client.id)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-300">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
        </div>
      </div>
    </div>
  )
}

