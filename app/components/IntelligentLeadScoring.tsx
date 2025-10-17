'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Zap, 
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Search,
  Eye,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  ArrowRight,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Award,
  Trophy,
  Flag,
  Bookmark,
  Share,
  Bell,
  Info,
  HelpCircle
} from 'lucide-react'

interface ScoringCriteria {
  id: string
  name: string
  description: string
  category: 'demographic' | 'behavioral' | 'engagement' | 'fit' | 'value'
  weight: number
  maxPoints: number
  currentValue?: number
  currentPoints?: number
  formula?: string
  isActive: boolean
  icon: React.ReactNode
}

interface ScoringModel {
  id: string
  name: string
  description: string
  version: string
  isActive: boolean
  totalWeight: number
  criteria: ScoringCriteria[]
  accuracy: number
  lastUpdated: string
  performance: {
    precision: number
    recall: number
    f1Score: number
    conversionRate: number
  }
}

interface LeadScore {
  leadId: string
  businessName: string
  totalScore: number
  aiScore: number
  mlScore: number
  weightedScore: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  confidence: number
  breakdown: {
    demographic: number
    behavioral: number
    engagement: number
    fit: number
    value: number
  }
  insights: string[]
  recommendations: string[]
  lastScored: string
  scoreHistory: Array<{
    date: string
    score: number
    reason: string
  }>
}

interface IntelligentLeadScoringProps {
  businessId?: string
  autoRefresh?: boolean
}

export default function IntelligentLeadScoring({ 
  businessId = 'default',
  autoRefresh = true
}: IntelligentLeadScoringProps) {
  const [scoringModels, setScoringModels] = useState<ScoringModel[]>([])
  const [activeModel, setActiveModel] = useState<ScoringModel | null>(null)
  const [leadScores, setLeadScores] = useState<LeadScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<LeadScore | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'model' | 'leads' | 'analytics'>('overview')
  const [showModelBuilder, setShowModelBuilder] = useState(false)
  const [editingCriteria, setEditingCriteria] = useState<ScoringCriteria | null>(null)
  const [filters, setFilters] = useState({
    priority: 'all',
    score_min: 0,
    score_max: 100,
    search: '',
    category: 'all'
  })

  // Fetch scoring data
  const fetchScoringData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/leads/scoring/advanced?businessId=${businessId}`)
      const result = await response.json()

      if (result.success) {
        setScoringModels(result.models || [])
        setActiveModel(result.activeModel || null)
        setLeadScores(result.leadScores || [])
      } else {
        setError(result.error || 'Failed to fetch scoring data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scoring data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScoringData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchScoringData, 300000) // Refresh every 5 minutes
      return () => clearInterval(interval)
    }
  }, [businessId, autoRefresh])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getPriorityColor = (priority: LeadScore['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100'
      case 'high':
        return 'text-orange-600 bg-orange-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredLeads = leadScores.filter(lead => {
    if (filters.priority !== 'all' && lead.priority !== filters.priority) return false
    if (filters.score_min && lead.totalScore < filters.score_min) return false
    if (filters.score_max && lead.totalScore > filters.score_max) return false
    if (filters.search && !lead.businessName.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const renderOverview = () => {
    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Model</p>
                <p className="text-xl font-bold text-gray-900">
                  {activeModel ? activeModel.name : 'None'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Score</p>
                <p className="text-xl font-bold text-gray-900">
                  {leadScores.length > 0 
                    ? Math.round(leadScores.reduce((sum, lead) => sum + lead.totalScore, 0) / leadScores.length)
                    : 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-xl font-bold text-gray-900">
                  {leadScores.filter(lead => lead.priority === 'high' || lead.priority === 'urgent').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-xl font-bold text-gray-900">
                  {activeModel ? `${activeModel.accuracy.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Model Performance */}
        {activeModel && (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{activeModel.performance.precision.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Precision</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{activeModel.performance.recall.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Recall</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{activeModel.performance.f1Score.toFixed(2)}</p>
                <p className="text-sm text-gray-600">F1 Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{activeModel.performance.conversionRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Conversion Rate</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Scoring Leads */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Scoring Leads</h3>
          <div className="space-y-3">
            {leadScores
              .sort((a, b) => b.totalScore - a.totalScore)
              .slice(0, 5)
              .map((lead, index) => (
                <motion.div
                  key={lead.leadId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{lead.businessName}</p>
                      <p className="text-sm text-gray-600">
                        Confidence: {lead.confidence.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(lead.priority)}`}>
                      {lead.priority}
                    </span>
                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${getScoreColor(lead.totalScore)}`}>
                      {lead.totalScore}
                    </span>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </div>
    )
  }

  const renderModelBuilder = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Scoring Model Builder</h3>
          <button
            onClick={() => setShowModelBuilder(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Model
          </button>
        </div>

        {activeModel && (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-semibold text-gray-900">{activeModel.name}</h4>
                <p className="text-sm text-gray-600">{activeModel.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Version {activeModel.version}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {activeModel.criteria.length} Criteria
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {activeModel.criteria.map((criteria) => (
                <motion.div
                  key={criteria.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {criteria.icon}
                      <div>
                        <h5 className="font-medium text-gray-900">{criteria.name}</h5>
                        <p className="text-sm text-gray-600">{criteria.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {criteria.category}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                        Weight: {criteria.weight}%
                      </span>
                      <button
                        onClick={() => setEditingCriteria(criteria)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Weight</span>
                        <span className="font-medium">{criteria.weight}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${criteria.weight}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Max Points</span>
                        <span className="font-medium">{criteria.maxPoints}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(criteria.maxPoints / 100) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {criteria.formula && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Formula:</p>
                      <code className="text-sm text-gray-800">{criteria.formula}</code>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderLeadsView = () => {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search leads..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Score:</span>
              <input
                type="number"
                placeholder="Min"
                value={filters.score_min}
                onChange={(e) => setFilters({ ...filters, score_min: parseInt(e.target.value) || 0 })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.score_max}
                onChange={(e) => setFilters({ ...filters, score_max: parseInt(e.target.value) || 100 })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ML Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Scored
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <motion.tr
                    key={lead.leadId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{lead.businessName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-sm font-bold rounded-full ${getScoreColor(lead.totalScore)}`}>
                        {lead.totalScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.aiScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.mlScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(lead.priority)}`}>
                        {lead.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.confidence.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(lead.lastScored)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-800">Scoring System Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchScoringData}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Intelligent Lead Scoring</h2>
          <p className="text-gray-600">AI-powered lead scoring and qualification system</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModelBuilder(!showModelBuilder)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Model Builder
          </button>
          <button
            onClick={fetchScoringData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setViewMode('overview')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'overview' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setViewMode('model')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'model' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Model
        </button>
        <button
          onClick={() => setViewMode('leads')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'leads' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Leads
        </button>
        <button
          onClick={() => setViewMode('analytics')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'analytics' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderOverview()}
          </motion.div>
        )}

        {viewMode === 'model' && (
          <motion.div
            key="model"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderModelBuilder()}
          </motion.div>
        )}

        {viewMode === 'leads' && (
          <motion.div
            key="leads"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderLeadsView()}
          </motion.div>
        )}

        {viewMode === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-lg p-12 shadow-sm border text-center"
          >
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Scoring Analytics</h3>
            <p className="text-gray-600">Advanced analytics and reporting coming soon...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{selectedLead.businessName}</h3>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Score Breakdown</h4>
                    <div className="space-y-3">
                      {Object.entries(selectedLead.breakdown).map(([category, score]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 capitalize">{category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8">{score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Score History</h4>
                    <div className="space-y-2">
                      {selectedLead.scoreHistory.slice(0, 5).map((entry, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{entry.score}</span>
                            <span className="text-gray-600 ml-2">{entry.reason}</span>
                          </div>
                          <span className="text-gray-500">{formatDate(entry.date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">AI Insights</h4>
                    <ul className="space-y-1">
                      {selectedLead.insights.map((insight, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 text-yellow-500 mt-1 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {selectedLead.recommendations.map((recommendation, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <ArrowRight className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
