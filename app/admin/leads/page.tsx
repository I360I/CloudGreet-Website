'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, Mail, Building, MapPin, Calendar, 
  DollarSign, Users, Target, TrendingUp,
  Plus, Search, Filter, Download, Send,
  CheckCircle, Clock, AlertCircle, Star,
  UserPlus, Zap, X
} from 'lucide-react'

interface Lead {
  id: string
  business_name: string
  owner_name?: string
  owner_email?: string
  phone: string
  business_type: string
  city?: string
  state?: string
  website?: string
  total_score?: number
  enrichment_status: 'pending' | 'in_progress' | 'enriched' | 'failed'
  outreach_status: 'new' | 'contacted' | 'responded' | 'qualified' | 'converted' | 'closed'
  last_contact_date?: string
  notes?: string
  created_at: string
  personalized_pitch?: string
  pain_points?: string[]
}

export default function LeadsManagement() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showAddLead, setShowAddLead] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [convertingLead, setConvertingLead] = useState<string | null>(null)

  // Load real leads from API
  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/apollo-killer/leads', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads || [])
      } else {
        console.error('Failed to load leads')
        setLeads([])
      }
    } catch (error) {
      console.error('Error loading leads:', error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.owner_name && lead.owner_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (lead.owner_email && lead.owner_email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFilter = filterStatus === 'all' || lead.outreach_status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const convertLeadToClient = async (leadId: string) => {
    try {
      setConvertingLead(leadId)
      
      const response = await fetch('/api/admin/convert-lead-to-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ leadId })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Lead converted to client successfully!\n\nClient Email: ${data.data.client.email}\nPassword: ${data.data.client.password}\n\nPlease save these credentials!`)
        
        // Update the lead status
        setLeads(leads.map(lead => 
          lead.id === leadId 
            ? { ...lead, outreach_status: 'converted' as const }
            : lead
        ))
      } else {
        const error = await response.json()
        alert(`❌ Failed to convert lead: ${error.error}`)
      }
    } catch (error) {
      console.error('Error converting lead:', error)
      alert('❌ Failed to convert lead. Please try again.')
    } finally {
      setConvertingLead(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-gray-100 text-gray-800'
      case 'contacted': return 'bg-blue-100 text-blue-800'
      case 'responded': return 'bg-yellow-100 text-yellow-800'
      case 'qualified': return 'bg-purple-100 text-purple-800'
      case 'converted': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="w-4 h-4" />
      case 'contacted': return <Phone className="w-4 h-4" />
      case 'responded': return <Star className="w-4 h-4" />
      case 'qualified': return <Calendar className="w-4 h-4" />
      case 'converted': return <CheckCircle className="w-4 h-4" />
      case 'closed': return <X className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const totalEstimatedRevenue = leads.reduce((sum, lead) => sum + (lead.total_score || 0), 0)
  const convertedLeads = leads.filter(lead => lead.outreach_status === 'converted').length
  const conversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
            <p className="text-gray-600 mt-2">Track and manage your sales pipeline</p>
          </div>
          <button
            onClick={() => setShowAddLead(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Lead
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900">{leads.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Closed Deals</p>
                <p className="text-3xl font-bold text-green-600">{convertedLeads}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-3xl font-bold text-purple-600">{conversionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Est. Revenue</p>
                <p className="text-3xl font-bold text-green-600">${totalEstimatedRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="responded">Responded</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="closed">Closed</option>
            </select>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{lead.business_name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {lead.city && lead.state ? `${lead.city}, ${lead.state}` : 'Location not set'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{lead.owner_name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{lead.owner_email || 'No email'}</div>
                        <div className="text-sm text-gray-500">{lead.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {lead.business_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1 ${getStatusColor(lead.outreach_status)}`}>
                        {getStatusIcon(lead.outreach_status)}
                        {lead.outreach_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (lead.total_score || 0) >= 80 ? 'bg-green-100 text-green-800' :
                        (lead.total_score || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {lead.total_score || 0}/100
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.last_contact_date ? new Date(lead.last_contact_date).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        {lead.outreach_status !== 'converted' && (
                          <button
                            onClick={() => convertLeadToClient(lead.id)}
                            disabled={convertingLead === lead.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 flex items-center gap-1"
                          >
                            {convertingLead === lead.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                Converting...
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                Convert
                              </>
                            )}
                          </button>
                        )}
                        {lead.outreach_status === 'converted' && (
                          <span className="text-green-600 font-medium">✓ Converted</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lead Detail Modal */}
        {selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedLead.business_name}</h2>
                    <p className="text-gray-600">{selectedLead.owner_name}</p>
                  </div>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Contact Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{selectedLead.owner_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{selectedLead.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{selectedLead.city}, {selectedLead.state}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Business Details</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-600">Type: </span>
                        <span className="text-sm font-medium">{selectedLead.business_type}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Source: </span>
                        <span className="text-sm font-medium">Apollo Killer</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Est. Revenue: </span>
                        <span className="text-sm font-medium text-green-600">${selectedLead.total_score || 0}/year</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {selectedLead.notes}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" />
                    Call Now
                  </button>
                  <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />
                    Send Email
                  </button>
                  <button className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
