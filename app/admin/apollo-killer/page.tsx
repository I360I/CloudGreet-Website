'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BulkEnrichmentProgress from '@/app/components/BulkEnrichmentProgress'

interface EnrichedLead {
  id: string
  business_name: string
  address?: string
  city?: string
  state?: string
  business_type?: string
  total_score?: number
  enrichment_status: string
  owner_name?: string
  owner_title?: string
  owner_email?: string
  owner_phone?: string
  website_url?: string
  google_place_id?: string
  created_at: string
  last_enriched_at?: string
  enrichment_sources?: string[]
  decision_makers?: any[]
  pain_points?: string[]
  outreach_status?: string
}

export default function ApolloKillerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')
  const [businessType, setBusinessType] = useState('HVAC')
  const [isSearching, setIsSearching] = useState(false)
  const [leads, setLeads] = useState<EnrichedLead[]>([])
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null)
  const [enrichingLeads, setEnrichingLeads] = useState<Set<string>>(new Set())
  const [minScore, setMinScore] = useState(0)
  const [enrichmentFilter, setEnrichmentFilter] = useState<'all' | 'enriched' | 'pending'>('all')
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [bulkJobId, setBulkJobId] = useState<string | null>(null)
  const [showBulkProgress, setShowBulkProgress] = useState(false)

  // Load existing leads on mount
  useEffect(() => {
    loadExistingLeads()
  }, [enrichmentFilter, minScore])

  async function loadExistingLeads() {
    try {
      let url = `/api/apollo-killer/leads?filter=${enrichmentFilter}`
      if (minScore > 0) url += `&minScore=${minScore}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setLeads(data.leads || [])
      }
    } catch (error) {
      console.error('Failed to load leads:', error)
    }
  }

  async function handleSearch() {
    setIsSearching(true)
    
    try {
      const response = await fetch('/api/apollo-killer/search-enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          query: searchQuery,
          location: location,
          businessType: businessType
        })
      })

      const data = await response.json()
      if (data.success) {
        setLeads(data.leads || [])
      } else {
        alert(data.error || 'Search failed')
      }
    } catch (error) {
      alert('Search failed: ' + error)
    } finally {
      setIsSearching(false)
    }
  }

  async function enrichLead(leadId: string) {
    setEnrichingLeads(prev => new Set(prev).add(leadId))

    try {
      const response = await fetch('/api/apollo-killer/enrichment-processor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ leadId })
      })

      const data = await response.json()
      if (data.success) {
        // Update the lead in the list
        setLeads(prev => prev.map(lead => 
          lead.id === leadId ? { ...lead, ...data.lead } : lead
        ))
      } else {
        alert(data.error || 'Enrichment failed')
      }
    } catch (error) {
      alert('Enrichment failed: ' + error)
    } finally {
      setEnrichingLeads(prev => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  async function enrichBulk(leadIds: string[]) {
    try {
      const response = await fetch('/api/apollo-killer/bulk-enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ leadIds })
      })

      const data = await response.json()

      if (data.success) {
        setBulkJobId(data.jobId)
        setShowBulkProgress(true)
        setSelectedLeadIds(new Set()) // Clear selection
      } else {
        alert(data.error || 'Bulk enrichment failed')
      }
    } catch (error) {
      alert('Bulk enrichment failed: ' + error)
    }
  }

  function handleLeadSelection(leadId: string, selected: boolean) {
    const newSelection = new Set(selectedLeadIds)
    if (selected) {
      newSelection.add(leadId)
    } else {
      newSelection.delete(leadId)
    }
    setSelectedLeadIds(newSelection)
  }

  function selectAllVisible() {
    const visibleIds = new Set(filteredLeads.map(l => l.id))
    setSelectedLeadIds(visibleIds)
  }

  function clearSelection() {
    setSelectedLeadIds(new Set())
  }

  function getScoreColor(score: number): string {
    if (score >= 85) return 'text-green-500'
    if (score >= 70) return 'text-blue-500'
    if (score >= 50) return 'text-yellow-500'
    return 'text-gray-500'
  }

  function getPriorityBadge(lead: EnrichedLead) {
    if (!lead.total_score) return null
    
    if (lead.total_score >= 90) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-semibold">🔥 HOT</span>
    }
    if (lead.total_score >= 75) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold">✓ Qualified</span>
    }
    return null
  }

  // Filter and sort leads
  const filteredLeads = leads
    .filter(l => minScore === 0 || (l.total_score || 0) >= minScore)
    .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          🎯 Apollo Killer - Lead Enrichment
        </h1>
        <p className="text-gray-400">
          FREE unlimited lead enrichment • Owner contact discovery • AI-powered scoring
        </p>
      </div>

      {/* Search Interface */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search businesses (e.g., 'HVAC contractors')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <input
              type="text"
              placeholder="Location (e.g., 'Miami, FL')"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="HVAC">HVAC</option>
              <option value="Roofing">Roofing</option>
              <option value="Paint">Paint</option>
            </select>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
            >
              {isSearching ? 'Searching...' : '🔍 Search & Enrich'}
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">Min Score:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-gray-400 w-8">{minScore}</span>
            </div>
            
            <select
              value={enrichmentFilter}
              onChange={(e) => setEnrichmentFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm"
            >
              <option value="all">All Leads</option>
              <option value="enriched">Enriched Only</option>
              <option value="pending">Pending Only</option>
            </select>

            {selectedLeadIds.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => enrichBulk(Array.from(selectedLeadIds))}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold"
                >
                  Enrich Selected ({selectedLeadIds.size})
                </button>
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-semibold"
                >
                  Clear
                </button>
              </div>
            )}

            <button
              onClick={selectAllVisible}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold"
            >
              Select All
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Enrichment Progress */}
      {showBulkProgress && bulkJobId && (
        <div className="max-w-7xl mx-auto mb-6">
          <BulkEnrichmentProgress
            jobId={bulkJobId}
            onComplete={(job) => {
              setShowBulkProgress(false)
              setBulkJobId(null)
              // Refresh leads to show updated data
              loadExistingLeads()
            }}
            onClose={() => {
              setShowBulkProgress(false)
              setBulkJobId(null)
            }}
          />
        </div>
      )}

      {/* Results Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead List */}
        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-4">
          <AnimatePresence>
            {filteredLeads.map((lead, idx) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 border cursor-pointer transition-all hover:bg-gray-800/70 ${
                  selectedLead?.id === lead.id ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700'
                }`}
                onClick={() => setSelectedLead(lead)}
              >
                <div className="flex items-start gap-3">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.has(lead.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleLeadSelection(lead.id, e.target.checked)
                    }}
                    className="w-4 h-4 mt-1 accent-purple-500"
                  />
                  
                  {/* Lead Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{lead.business_name}</h3>
                        <p className="text-gray-400 text-sm">{lead.city}, {lead.state}</p>
                        <p className="text-gray-500 text-xs">{lead.business_type}</p>
                      </div>
                      <div className="text-right">
                        {lead.total_score && (
                          <div className={`text-2xl font-bold ${getScoreColor(lead.total_score)}`}>
                            {lead.total_score}
                          </div>
                        )}
                        {getPriorityBadge(lead)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      {lead.owner_name && (
                        <div className="flex items-center gap-1 text-sm text-gray-300">
                          <span>👤</span>
                          <span>{lead.owner_name}</span>
                          {lead.owner_title && <span className="text-gray-500">({lead.owner_title})</span>}
                        </div>
                      )}
                      {lead.owner_email && (
                        <div className="flex items-center gap-1 text-sm text-gray-300">
                          <span>📧</span>
                          <span>{lead.owner_email}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          lead.enrichment_status === 'enriched' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {lead.enrichment_status === 'enriched' ? '✓ Enriched' : '⏳ Pending'}
                        </span>
                        {lead.enrichment_sources && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {lead.enrichment_sources.length} sources
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {lead.owner_email && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Open email campaign modal (feature coming soon)
                            }}
                            className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-all"
                          >
                            📧 Email
                          </button>
                        )}
                        {lead.owner_phone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Open SMS campaign modal (feature coming soon)
                            }}
                            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-all"
                          >
                            📱 SMS
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            enrichLead(lead.id)
                          }}
                          disabled={enrichingLeads.has(lead.id)}
                          className="py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm font-semibold transition-all"
                        >
                          {enrichingLeads.has(lead.id) ? '⏳' : '🔍'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Lead Detail Panel */}
        {selectedLead && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 sticky top-4">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">{selectedLead.business_name}</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 bg-gray-700/50 border border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-600/50 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Business Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Business Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Address:</span>
                    <span className="text-white">{selectedLead.address || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">City/State:</span>
                    <span className="text-white">{selectedLead.city}, {selectedLead.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white">{selectedLead.business_type}</span>
                  </div>
                  {selectedLead.website_url && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Website:</span>
                      <a href={selectedLead.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        Visit Site
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Owner Info */}
              {(selectedLead.owner_name || selectedLead.owner_email || selectedLead.owner_phone) && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Owner Information</h3>
                  <div className="space-y-2 text-sm">
                    {selectedLead.owner_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white">{selectedLead.owner_name}</span>
                      </div>
                    )}
                    {selectedLead.owner_title && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Title:</span>
                        <span className="text-white">{selectedLead.owner_title}</span>
                      </div>
                    )}
                    {selectedLead.owner_email && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{selectedLead.owner_email}</span>
                      </div>
                    )}
                    {selectedLead.owner_phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Phone:</span>
                        <span className="text-white">{selectedLead.owner_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {selectedLead.total_score && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">AI Analysis</h3>
                  <div className="space-y-3">
                    <ScoreBar label="Overall Score" score={selectedLead.total_score} color="blue" />
                    {selectedLead.pain_points && selectedLead.pain_points.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Pain Points:</h4>
                        <div className="space-y-1">
                          {selectedLead.pain_points.map((point, idx) => (
                            <div key={idx} className="text-xs text-gray-400 bg-gray-700/50 rounded px-2 py-1">
                              • {point}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Decision Makers */}
              {selectedLead.decision_makers && selectedLead.decision_makers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Decision Makers</h3>
                  <div className="space-y-2">
                    {selectedLead.decision_makers.map((maker, idx) => (
                      <div key={idx} className="bg-gray-700/50 rounded-lg p-3">
                        <div className="font-semibold text-white">{maker.name}</div>
                        <div className="text-sm text-gray-400">{maker.title}</div>
                        {maker.profileUrl && (
                          <a href={maker.profileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
                            View LinkedIn
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enrichment Sources */}
              {selectedLead.enrichment_sources && selectedLead.enrichment_sources.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Data Sources</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedLead.enrichment_sources.map((source, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {source.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  }

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span>{score}/100</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color as keyof typeof colors]} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}