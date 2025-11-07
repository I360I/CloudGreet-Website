'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { logger } from '@/lib/monitoring'

interface Lead {
  id: string
  business_name: string
  contact_name: string | null
  phone: string
  email: string | null
  website: string | null
  address: string | null
  business_type: string | null
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'closed'
  source: 'google_places' | 'manual' | 'referral' | 'website'
  estimated_revenue: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface LeadsResponse {
  success: boolean
  leads: Lead[]
  statistics: {
    total: number
    new: number
    contacted: number
    qualified: number
    converted: number
    closed: number
  }
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [statistics, setStatistics] = useState<LeadsResponse['statistics']>({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    closed: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    business_type: '',
    source: 'manual' as const,
    notes: '',
    estimated_revenue: ''
  })

  // Fetch leads
  const fetchLeads = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (sourceFilter) params.append('source', sourceFilter)
      if (searchQuery) params.append('search', searchQuery)
      params.append('limit', limit.toString())
      params.append('offset', ((currentPage - 1) * limit).toString())

      const response = await fetch(`/api/admin/leads?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }

      const data: LeadsResponse = await response.json()
      
      if (data.success) {
        setLeads(data.leads)
        setStatistics(data.statistics)
        setTotalPages(Math.ceil(data.pagination.total / limit))
      } else {
        throw new Error('Failed to fetch leads')
      }
    } catch (err) {
      logger.error('Error fetching leads', { error: err instanceof Error ? err.message : 'Unknown error' })
      setError(err instanceof Error ? err.message : 'Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [statusFilter, sourceFilter, searchQuery, currentPage])

  // Create lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          business_name: formData.business_name,
          contact_name: formData.contact_name || null,
          phone: formData.phone,
          email: formData.email || null,
          website: formData.website || null,
          address: formData.address || null,
          business_type: formData.business_type || null,
          source: formData.source,
          notes: formData.notes || null,
          estimated_revenue: formData.estimated_revenue ? parseFloat(formData.estimated_revenue) : null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create lead')
      }

      setShowCreateForm(false)
      setFormData({
        business_name: '',
        contact_name: '',
        phone: '',
        email: '',
        website: '',
        address: '',
        business_type: '',
        source: 'manual',
        notes: '',
        estimated_revenue: ''
      })
      fetchLeads()
    } catch (err) {
      logger.error('Error creating lead', { error: err instanceof Error ? err.message : 'Unknown error' })
      alert(err instanceof Error ? err.message : 'Failed to create lead')
    }
  }

  // Update lead status
  const handleUpdateStatus = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const response = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          id: leadId,
          status: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update lead status')
      }

      fetchLeads()
    } catch (err) {
      logger.error('Error updating lead status', { error: err instanceof Error ? err.message : 'Unknown error' })
      alert(err instanceof Error ? err.message : 'Failed to update lead status')
    }
  }

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'qualified': return 'bg-purple-100 text-purple-800'
      case 'converted': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600 mt-2">
            View, create, and manage leads for client acquisition.
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : '+ Create Lead'}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{statistics.total}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">New</div>
          <div className="text-2xl font-bold text-blue-600">{statistics.new}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Contacted</div>
          <div className="text-2xl font-bold text-yellow-600">{statistics.contacted}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Qualified</div>
          <div className="text-2xl font-bold text-purple-600">{statistics.qualified}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Converted</div>
          <div className="text-2xl font-bold text-green-600">{statistics.converted}</div>
        </Card>
        <Card className="p-4 bg-white border border-gray-200">
          <div className="text-sm text-gray-600">Closed</div>
          <div className="text-2xl font-bold text-gray-600">{statistics.closed}</div>
        </Card>
      </div>

      {/* Create Lead Form */}
      {showCreateForm && (
        <Card className="p-6 bg-white border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Create New Lead</h2>
          <form onSubmit={handleCreateLead} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                </label>
                <input
                  type="text"
                  value={formData.business_type}
                  onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">Manual</option>
                  <option value="google_places">Google Places</option>
                  <option value="referral">Referral</option>
                  <option value="website">Website</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Revenue
                </label>
                <input
                  type="number"
                  value={formData.estimated_revenue}
                  onChange={(e) => setFormData({ ...formData, estimated_revenue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                onClick={() => setShowCreateForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Create Lead
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 bg-white border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, email, phone..."
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
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sources</option>
              <option value="manual">Manual</option>
              <option value="google_places">Google Places</option>
              <option value="referral">Referral</option>
              <option value="website">Website</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Leads Table */}
      <Card className="p-6 bg-white border border-gray-200">
        {loading ? (
          <div className="text-center py-8">Loading leads...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No leads found</div>
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
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{lead.business_name}</div>
                        {lead.business_type && (
                          <div className="text-sm text-gray-500">{lead.business_type}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{lead.contact_name || '-'}</div>
                        {lead.email && (
                          <div className="text-sm text-gray-500">{lead.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value as Lead['status'])}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)} border-0 focus:ring-2 focus:ring-blue-500`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="converted">Converted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lead.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.estimated_revenue ? `$${lead.estimated_revenue.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setEditingLead(lead)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
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

