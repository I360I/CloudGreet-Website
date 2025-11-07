'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { logger } from '@/lib/monitoring'

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

      const response = await fetch(`/api/admin/clients?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }

      const data: ClientsResponse = await response.json()
      
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
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch client details')
      }

      const data = await response.json()
      
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
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (selectedClient && clientDetail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              onClick={() => {
                setSelectedClient(null)
                setClientDetail(null)
              }}
              variant="outline"
              className="mb-4"
            >
              ← Back to Clients
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{clientDetail.client.business_name}</h1>
            <p className="text-gray-600 mt-2">Client Details & Activity</p>
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Business Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Business Name</div>
                <div className="text-lg font-medium">{clientDetail.client.business_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="text-lg">{clientDetail.client.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Phone</div>
                <div className="text-lg">{clientDetail.client.phone_number || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Business Type</div>
                <div className="text-lg">{clientDetail.client.business_type || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(clientDetail.client.subscription_status)}`}>
                  {clientDetail.client.subscription_status}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Owner Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Name</div>
                <div className="text-lg font-medium">{clientDetail.client.owner.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="text-lg">{clientDetail.client.owner.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Phone</div>
                <div className="text-lg">{clientDetail.client.owner.phone || 'Not set'}</div>
              </div>
              {clientDetail.client.owner.last_login && (
                <div>
                  <div className="text-sm text-gray-600">Last Login</div>
                  <div className="text-lg">{new Date(clientDetail.client.owner.last_login).toLocaleString()}</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Activity Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-gray-200">
            <div className="text-sm text-gray-600">Total Calls</div>
            <div className="text-2xl font-bold">{clientDetail.activity.calls.total}</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-200">
            <div className="text-sm text-gray-600">Answered</div>
            <div className="text-2xl font-bold text-green-600">{clientDetail.activity.calls.answered}</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-200">
            <div className="text-sm text-gray-600">Appointments</div>
            <div className="text-2xl font-bold">{clientDetail.activity.appointments.total}</div>
          </Card>
          <Card className="p-4 bg-white border border-gray-200">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-2xl font-bold text-green-600">${clientDetail.activity.revenue.total.toLocaleString()}</div>
          </Card>
        </div>

        {/* Recent Calls */}
        <Card className="p-6 bg-white border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Recent Calls</h2>
          {clientDetail.activity.calls.recent.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No calls yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientDetail.activity.calls.recent.map((call) => (
                    <tr key={call.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{call.from_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{call.to_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{call.duration}s</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{call.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(call.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Appointments */}
        <Card className="p-6 bg-white border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Recent Appointments</h2>
          {clientDetail.activity.appointments.recent.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No appointments yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientDetail.activity.appointments.recent.map((apt) => (
                    <tr key={apt.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{apt.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{apt.service_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(apt.scheduled_date).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{apt.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* AI Agent Info */}
        {clientDetail.aiAgent && (
          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">AI Agent</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Agent Name</div>
                <div className="text-lg">{clientDetail.aiAgent.agent_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(clientDetail.aiAgent.status)}`}>
                  {clientDetail.aiAgent.status}
                </span>
              </div>
              {clientDetail.aiAgent.phone_number && (
                <div>
                  <div className="text-sm text-gray-600">Phone Number</div>
                  <div className="text-lg">{clientDetail.aiAgent.phone_number}</div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
          <p className="text-gray-600 mt-2">
            View and manage all clients (businesses) on the platform.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{statistics.total}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Inactive</div>
          <div className="text-2xl font-bold text-gray-600">{statistics.inactive}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Suspended</div>
          <div className="text-2xl font-bold text-red-600">{statistics.suspended}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Cancelled</div>
          <div className="text-2xl font-bold text-gray-600">{statistics.cancelled}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Clients Table */}
      <Card className="p-6 bg-white border border-gray-200">
        {loading ? (
          <div className="text-center py-8">Loading clients...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No clients found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calls
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appointments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{client.business_name}</div>
                        {client.business_type && (
                          <div className="text-sm text-gray-500">{client.business_type}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.email}</div>
                        {client.phone_number && (
                          <div className="text-sm text-gray-500">{client.phone_number}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.subscription_status)}`}>
                          {client.subscription_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.totalCalls}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.totalAppointments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => fetchClientDetail(client.id)}
                          className="text-blue-600 hover:text-blue-900"
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
                <div className="text-sm text-gray-700">
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
      </Card>
    </div>
  )
}

