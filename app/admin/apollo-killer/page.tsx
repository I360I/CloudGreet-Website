'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface EnrichedLead {
  id: string
  business_name: string
  address?: string
  city?: string
  state?: string
  phone?: string
  website?: string
  google_rating?: number
  google_review_count?: number
  owner_name?: string
  owner_title?: string
  owner_email?: string
  owner_email_verified?: boolean
  owner_email_confidence?: number
  owner_phone?: string
  owner_linkedin_url?: string
  total_score?: number
  fit_score?: number
  engagement_score?: number
  contact_quality_score?: number
  opportunity_score?: number
  pain_points?: string[]
  personalized_pitch?: string
  enrichment_status?: string
  outreach_status?: string
  tags?: string[]
  priority?: string
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
          searchQuery,
          location,
          businessType
        })
      })

      const data = await response.json()

      if (data.success) {
        setLeads(data.leads.map((l: any) => ({
          id: l.id,
          business_name: l.name,
          address: l.address,
          phone: l.phone,
          website: l.website,
          google_rating: l.rating,
          google_review_count: l.reviews,
          enrichment_status: l.status === 'existing' ? 'enriched' : 'pending',
          total_score: 0
        })))

        // Auto-enrich new leads
        const newLeads = data.leads.filter((l: any) => l.status === 'queued')
        if (newLeads.length > 0) {
          setTimeout(() => enrichBulk(newLeads.map((l: any) => l.id)), 1000)
        }
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
        // Update lead in list
        setLeads(prev => prev.map(l => 
          l.id === leadId ? data.lead : l
        ))

        // Update selected lead if it's the one we enriched
        if (selectedLead?.id === leadId) {
          setSelectedLead(data.lead)
        }
      }
    } catch (error) {
      console.error('Enrichment failed:', error)
    } finally {
      setEnrichingLeads(prev => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  async function enrichBulk(leadIds: string[]) {
    for (const id of leadIds) {
      await enrichLead(id)
      // Stagger requests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
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
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Search Query</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., HVAC contractors in Dallas"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Business Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="HVAC">HVAC</option>
                <option value="Roofing">Roofing</option>
                <option value="Painting">Painting</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? '🔍 Searching...' : '🚀 Search & Enrich'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {leads.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Min Score:</span>
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option value="0">All</option>
                <option value="70">70+</option>
                <option value="80">80+</option>
                <option value="90">90+</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              <select
                value={enrichmentFilter}
                onChange={(e) => setEnrichmentFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm"
              >
                <option value="all">All</option>
                <option value="enriched">Enriched</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-400">
              {filteredLeads.length} leads • {filteredLeads.filter(l => l.total_score && l.total_score >= 80).length} qualified
            </div>
          </div>
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
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedLead(lead)}
                className={`bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedLead?.id === lead.id
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {lead.business_name}
                    </h3>
                    {lead.google_rating && (
                      <div className="text-sm text-gray-400">
                        ⭐ {lead.google_rating.toFixed(1)} ({lead.google_review_count} reviews)
                      </div>
                    )}
                  </div>

                  {lead.total_score !== undefined && lead.total_score > 0 ? (
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(lead.total_score)}`}>
                        {lead.total_score}
                      </div>
                      <div className="text-xs text-gray-400">score</div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Not scored</div>
                  )}
                </div>

                {lead.owner_name && (
                  <div className="mb-3">
                    <div className="text-sm text-blue-400 font-semibold">
                      👤 {lead.owner_name}
                      {lead.owner_title && <span className="text-gray-400"> • {lead.owner_title}</span>}
                    </div>
                    {lead.owner_email && (
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        ✅ {lead.owner_email}
                        {lead.owner_email_verified && (
                          <span className="text-xs text-green-500">verified</span>
                        )}
                      </div>
                    )}
                    {lead.owner_phone && (
                      <div className="text-sm text-gray-400">
                        📱 {lead.owner_phone}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  {getPriorityBadge(lead)}
                  
                  {lead.enrichment_status === 'pending' && (
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                      ⏳ Pending
                    </span>
                  )}

                  {lead.enrichment_status === 'enriched' && (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                      ✓ Enriched
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {lead.enrichment_status !== 'enriched' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        enrichLead(lead.id)
                      }}
                      disabled={enrichingLeads.has(lead.id)}
                      className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {enrichingLeads.has(lead.id) ? '⚡ Enriching...' : '⚡ Enrich Now'}
                    </button>
                  )}
                  
                  {lead.owner_email && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Open email campaign modal
                      }}
                      className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition-all"
                    >
                      📧 Email
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredLeads.length === 0 && !isSearching && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-lg">No leads yet</div>
              <div className="text-sm">Search for businesses to get started</div>
            </div>
          )}
        </div>

        {/* Lead Detail Panel */}
        <div className="sticky top-8 h-fit">
          {selectedLead ? (
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border-2 border-blue-500">
              <h2 className="text-2xl font-bold mb-4">{selectedLead.business_name}</h2>

              {/* Score Breakdown */}
              {selectedLead.total_score !== undefined && selectedLead.total_score > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">LEAD QUALITY SCORES</h3>
                  
                  <div className="space-y-2">
                    <ScoreBar label="Overall" score={selectedLead.total_score} color="blue" />
                    {selectedLead.fit_score !== undefined && (
                      <ScoreBar label="Fit" score={selectedLead.fit_score} color="green" />
                    )}
                    {selectedLead.engagement_score !== undefined && (
                      <ScoreBar label="Engagement" score={selectedLead.engagement_score} color="purple" />
                    )}
                    {selectedLead.contact_quality_score !== undefined && (
                      <ScoreBar label="Contact Quality" score={selectedLead.contact_quality_score} color="yellow" />
                    )}
                    {selectedLead.opportunity_score !== undefined && (
                      <ScoreBar label="Opportunity" score={selectedLead.opportunity_score} color="red" />
                    )}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">CONTACT INFORMATION</h3>
                <div className="space-y-2 text-sm">
                  {selectedLead.owner_name && (
                    <div><strong>Owner:</strong> {selectedLead.owner_name} {selectedLead.owner_title && `(${selectedLead.owner_title})`}</div>
                  )}
                  {selectedLead.owner_email && (
                    <div><strong>Email:</strong> {selectedLead.owner_email}</div>
                  )}
                  {selectedLead.owner_phone && (
                    <div><strong>Phone:</strong> {selectedLead.owner_phone}</div>
                  )}
                  {selectedLead.website && (
                    <div><strong>Website:</strong> <a href={selectedLead.website} target="_blank" className="text-blue-400 hover:underline">{selectedLead.website}</a></div>
                  )}
                  {selectedLead.owner_linkedin_url && (
                    <div><strong>LinkedIn:</strong> <a href={selectedLead.owner_linkedin_url} target="_blank" className="text-blue-400 hover:underline">View Profile</a></div>
                  )}
                </div>
              </div>

              {/* Pain Points */}
              {selectedLead.pain_points && selectedLead.pain_points.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">💡 PAIN POINTS DETECTED</h3>
                  <ul className="space-y-1 text-sm">
                    {selectedLead.pain_points.map((point, idx) => (
                      <li key={idx} className="text-yellow-400">• {point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Personalized Pitch */}
              {selectedLead.personalized_pitch && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">🎯 PERSONALIZED PITCH</h3>
                  <p className="text-sm text-gray-300 bg-gray-900/50 p-4 rounded-lg italic">
                    "{selectedLead.personalized_pitch}"
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <button className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-all">
                  📧 Send Email Campaign
                </button>
                <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all">
                  📱 Send SMS
                </button>
                <button className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all">
                  ➕ Add to CRM
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-12 border border-gray-700 text-center text-gray-400">
              <div className="text-4xl mb-4">👈</div>
              <div>Select a lead to view details</div>
            </div>
          )}
        </div>
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

