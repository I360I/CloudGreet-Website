'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Target, TrendingUp, Star, AlertCircle, 
  Phone, Mail, MapPin, Calendar, DollarSign, X
} from 'lucide-react'

interface Lead {
  id: string
  name: string
  phone: string
  email: string
  company: string
  source: string
  leadScore: number
  aiInsights: string[]
  priority: 'high' | 'medium' | 'low'
  lastContact: string
  estimatedValue: number
}

interface LeadScoringProps {
  businessId: string
}

export default function LeadScoring({ businessId }: LeadScoringProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  useEffect(() => {
    loadLeads()
  }, [businessId])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/leads/scoring?businessId=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads || [])
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20'
    if (score >= 60) return 'bg-yellow-500/20'
    return 'bg-red-500/20'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20'
      case 'low': return 'text-blue-400 bg-blue-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Analyzing Leads...</h3>
            <p className="text-sm text-gray-400">AI-powered lead scoring</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700/50 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-700/50 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-700/50 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">AI Lead Scoring</h3>
            <p className="text-sm text-gray-400">Intelligent lead prioritization</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">No leads to analyze</div>
          <div className="text-sm text-gray-500">Lead scores will appear when leads are added</div>
        </div>
      </div>
    )
  }

  const highPriorityLeads = leads.filter(lead => lead.priority === 'high')
  const averageScore = leads.reduce((sum, lead) => sum + lead.leadScore, 0) / leads.length

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
          <Target className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">AI Lead Scoring</h3>
          <p className="text-sm text-gray-400">Intelligent lead prioritization</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{leads.length}</div>
            <div className="text-sm text-gray-400">Total Leads</div>
          </div>
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-400">{highPriorityLeads.length}</div>
            <div className="text-sm text-gray-400">High Priority</div>
          </div>
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{averageScore.toFixed(0)}</div>
            <div className="text-sm text-gray-400">Avg Score</div>
          </div>
        </div>

        {/* High Priority Leads */}
        {highPriorityLeads.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="font-medium text-red-400">High Priority Leads</span>
            </div>
            <div className="space-y-3">
              {highPriorityLeads.slice(0, 3).map((lead) => (
                <div 
                  key={lead.id}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 cursor-pointer hover:bg-red-500/20 transition-colors"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                        <Target className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-sm text-gray-400">{lead.company}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-400">{lead.leadScore}%</div>
                      <div className="text-xs text-gray-400">Score</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Leads */}
        <div>
          <div className="text-sm font-medium text-gray-300 mb-4">All Leads (Sorted by Score)</div>
          <div className="space-y-3">
            {leads.slice(0, 10).map((lead) => (
              <div 
                key={lead.id}
                className="bg-gray-700/30 rounded-lg p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => setSelectedLead(lead)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Target className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-gray-400">{lead.company}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                      {lead.priority.toUpperCase()}
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(lead.leadScore)}`}>
                        {lead.leadScore}%
                      </div>
                      <div className="text-xs text-gray-400">Score</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Details Modal */}
        {selectedLead && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Lead Analysis</h3>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lead Info */}
                  <div>
                    <h4 className="font-medium text-gray-300 mb-4">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">{selectedLead.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">{selectedLead.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">{selectedLead.company}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">Last contact: {new Date(selectedLead.lastContact).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score & Priority */}
                  <div>
                    <h4 className="font-medium text-gray-300 mb-4">AI Analysis</h4>
                    <div className="space-y-4">
                      <div className={`${getScoreBg(selectedLead.leadScore)} border border-gray-600/50 rounded-lg p-4`}>
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getScoreColor(selectedLead.leadScore)}`}>
                            {selectedLead.leadScore}%
                          </div>
                          <div className="text-sm text-gray-300">Lead Score</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Priority:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedLead.priority)}`}>
                          {selectedLead.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Est. Value:</span>
                        <span className="text-sm font-medium text-green-400">
                          ${selectedLead.estimatedValue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Insights */}
                {selectedLead.aiInsights.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-300 mb-3">AI Insights</h4>
                    <div className="space-y-2">
                      {selectedLead.aiInsights.map((insight, index) => (
                        <div key={index} className="bg-gray-700/30 rounded-lg p-3">
                          <div className="text-sm text-gray-300">{insight}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
