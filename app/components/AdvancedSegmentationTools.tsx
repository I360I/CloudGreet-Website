'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target, 
  Users, 
  Filter, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  Settings,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  Zap,
  Brain,
  Cpu,
  Network,
  Route,
  Navigation,
  MapPin,
  Globe,
  Map,
  Globe2,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Droplets,
  Flame,
  Snowflake,
  Lightbulb,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Star,
  Sparkles,
  Gem,
  Crown,
  Award,
  Trophy,
  Medal,
  Badge,
  User,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  FileText,
  File,
  Folder,
  FolderOpen,
  Archive,
  ArchiveRestore,
  Trash,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  KeyRound,
  Fingerprint,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Share,
  Copy,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Move,
  GripVertical,
  GripHorizontal,
  Layout,
  Grid,
  List,
  Columns,
  Rows,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Pentagon,
  Octagon,
  RectangleHorizontal,
  RectangleVertical,
  Tag,
  Tags,
  Hash,
  AtSign,
  Timer,
  Bell,
  Play,
  Pause,
} from 'lucide-react'

interface SegmentationRule {
  id: string
  name: string
  description: string
  isActive: boolean
  conditions: {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between' | 'is_empty' | 'is_not_empty'
    value: any
    logicalOperator?: 'AND' | 'OR'
  }[]
  targetSegment: string
  priority: number
  businessId: string
  createdAt: string
  updatedAt: string
}

interface LeadSegment {
  id: string
  name: string
  description: string
  color: string
  isActive: boolean
  criteria: SegmentationRule[]
  leadCount: number
  conversionRate: number
  averageValue: number
  totalValue: number
  businessId: string
  createdAt: string
  updatedAt: string
}

interface TargetingCampaign {
  id: string
  name: string
  description: string
  isActive: boolean
  targetSegments: string[]
  campaignType: 'email' | 'sms' | 'call' | 'social' | 'retargeting' | 'nurture'
  content: {
    subject?: string
    message: string
    template?: string
    attachments?: string[]
  }
  schedule: {
    startDate: string
    endDate?: string
    frequency: 'once' | 'daily' | 'weekly' | 'monthly'
    timeOfDay: string
  }
  performance: {
    totalSent: number
    totalOpened: number
    totalClicked: number
    totalConverted: number
    openRate: number
    clickRate: number
    conversionRate: number
    cost: number
    revenue: number
    roi: number
  }
  businessId: string
  createdAt: string
  updatedAt: string
}

interface SegmentationAnalytics {
  totalLeads: number
  segmentsDistribution: Array<{
    segmentId: string
    segmentName: string
    leadCount: number
    percentage: number
    averageValue: number
    conversionRate: number
  }>
  segmentPerformance: Array<{
    segmentId: string
    segmentName: string
    totalValue: number
    convertedValue: number
    conversionRate: number
    averageDealSize: number
  }>
  targetingEffectiveness: Array<{
    campaignId: string
    campaignName: string
    targetSegments: string[]
    conversionRate: number
    roi: number
    costPerLead: number
  }>
  demographicBreakdown: {
    industry: Array<{ name: string; count: number; percentage: number }>
    companySize: Array<{ name: string; count: number; percentage: number }>
    location: Array<{ name: string; count: number; percentage: number }>
    source: Array<{ name: string; count: number; percentage: number }>
  }
}

interface AdvancedSegmentationToolsProps {
  businessId?: string
  autoRefresh?: boolean
}

export default function AdvancedSegmentationTools({ 
  businessId = 'default',
  autoRefresh = true
}: AdvancedSegmentationToolsProps) {
  const [segments, setSegments] = useState<LeadSegment[]>([])
  const [campaigns, setCampaigns] = useState<TargetingCampaign[]>([])
  const [analytics, setAnalytics] = useState<SegmentationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'segments' | 'campaigns' | 'rules' | 'analytics'>('overview')
  const [selectedSegment, setSelectedSegment] = useState<LeadSegment | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<TargetingCampaign | null>(null)
  const [showSegmentBuilder, setShowSegmentBuilder] = useState(false)
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false)
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [editingSegment, setEditingSegment] = useState<LeadSegment | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<TargetingCampaign | null>(null)
  const [editingRule, setEditingRule] = useState<SegmentationRule | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  })

  // Fetch segmentation data
  const fetchSegmentationData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/leads/segmentation?businessId=${businessId}&includeAnalytics=true`)
      const result = await response.json()

      if (result.success) {
        setSegments(result.segments || [])
        setCampaigns(result.campaigns || [])
        setAnalytics(result.analytics || null)
      } else {
        setError(result.error || 'Failed to fetch segmentation data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch segmentation data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSegmentationData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchSegmentationData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [businessId, autoRefresh])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getSegmentColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'blue': 'bg-blue-100 text-blue-800 border-blue-200',
      'green': 'bg-green-100 text-green-800 border-green-200',
      'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'red': 'bg-red-100 text-red-800 border-red-200',
      'purple': 'bg-purple-100 text-purple-800 border-purple-200',
      'pink': 'bg-pink-100 text-pink-800 border-pink-200',
      'indigo': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'gray': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colorMap[color] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getCampaignTypeIcon = (type: TargetingCampaign['campaignType']) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'sms':
        return <MessageSquare className="w-4 h-4" />
      case 'call':
        return <Phone className="w-4 h-4" />
      case 'social':
        return <Users className="w-4 h-4" />
      case 'retargeting':
        return <Target className="w-4 h-4" />
      case 'nurture':
        return <Zap className="w-4 h-4" />
      default:
        return <Target className="w-4 h-4" />
    }
  }

  const getCampaignTypeColor = (type: TargetingCampaign['campaignType']) => {
    switch (type) {
      case 'email':
        return 'text-blue-600 bg-blue-100'
      case 'sms':
        return 'text-green-600 bg-green-100'
      case 'call':
        return 'text-purple-600 bg-purple-100'
      case 'social':
        return 'text-pink-600 bg-pink-100'
      case 'retargeting':
        return 'text-orange-600 bg-orange-100'
      case 'nurture':
        return 'text-indigo-600 bg-indigo-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredSegments = segments.filter(segment => {
    if (filters.status !== 'all' && segment.isActive !== (filters.status === 'active')) return false
    if (filters.search && !segment.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filters.status !== 'all' && campaign.isActive !== (filters.status === 'active')) return false
    if (filters.type !== 'all' && campaign.campaignType !== filters.type) return false
    if (filters.search && !campaign.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const renderOverview = () => {
    const totalSegments = segments.length
    const activeSegments = segments.filter(s => s.isActive).length
    const totalCampaigns = campaigns.length
    const activeCampaigns = campaigns.filter(c => c.isActive).length

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Segments</p>
                <p className="text-xl font-bold text-gray-900">{totalSegments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Segments</p>
                <p className="text-xl font-bold text-gray-900">{activeSegments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Campaigns</p>
                <p className="text-xl font-bold text-gray-900">{totalCampaigns}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                <p className="text-xl font-bold text-gray-900">{activeCampaigns}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Segment Distribution */}
        {analytics && (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Segment Distribution</h3>
            <div className="space-y-4">
              {analytics.segmentsDistribution.slice(0, 5).map((segment) => (
                <div key={segment.segmentId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-900">{segment.segmentName}</p>
                      <p className="text-sm text-gray-600">{segment.leadCount} leads</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Avg Value</p>
                      <p className="font-semibold">{formatCurrency(segment.averageValue)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Conversion</p>
                      <p className="font-semibold text-green-600">{segment.conversionRate.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">% of Total</p>
                      <p className="font-semibold">{segment.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Performance */}
        {analytics && (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Campaigns</h3>
            <div className="space-y-4">
              {analytics.targetingEffectiveness.slice(0, 3).map((campaign) => (
                <div key={campaign.campaignId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{campaign.campaignName}</p>
                      <p className="text-sm text-gray-600">{campaign.targetSegments.length} segments</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Conversion</p>
                      <p className="font-semibold text-green-600">{campaign.conversionRate.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">ROI</p>
                      <p className="font-semibold text-blue-600">{campaign.roi.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Cost/Lead</p>
                      <p className="font-semibold">{formatCurrency(campaign.costPerLead)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSegmentsView = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Lead Segments</h3>
          <button
            onClick={() => setShowSegmentBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Segment
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search segments..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Segments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSegments.map((segment) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${segment.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Target className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{segment.name}</h4>
                    <p className="text-sm text-gray-600">{segment.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingSegment(segment)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <span className={`px-2 py-1 text-xs rounded-full ${getSegmentColor(segment.color)}`}>
                    {segment.color}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${segment.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {segment.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Lead Count</p>
                    <p className="text-xl font-bold text-gray-900">{segment.leadCount}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
                    <p className="text-xl font-bold text-green-600">{segment.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Avg Value</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(segment.averageValue)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Value</p>
                    <p className="text-xl font-bold text-purple-600">{formatCurrency(segment.totalValue)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Segmentation Rules</p>
                  <div className="space-y-1">
                    {segment.criteria.slice(0, 3).map((rule, index) => (
                      <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {rule.conditions.map((condition, i) => (
                          <span key={i}>
                            {condition.field} {condition.operator} {JSON.stringify(condition.value)}
                            {i < rule.conditions.length - 1 && ' AND '}
                          </span>
                        ))}
                      </div>
                    ))}
                    {segment.criteria.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{segment.criteria.length - 3} more rules
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const renderCampaignsView = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Targeting Campaigns</h3>
          <button
            onClick={() => setShowCampaignBuilder(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="call">Call</option>
              <option value="social">Social</option>
              <option value="retargeting">Retargeting</option>
              <option value="nurture">Nurture</option>
            </select>
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${campaign.isActive ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    {getCampaignTypeIcon(campaign.campaignType)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                    <p className="text-sm text-gray-600">{campaign.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingCampaign(campaign)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <span className={`px-2 py-1 text-xs rounded-full ${getCampaignTypeColor(campaign.campaignType)}`}>
                    {campaign.campaignType}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {campaign.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Target Segments</p>
                  <div className="flex flex-wrap gap-1">
                    {campaign.targetSegments.slice(0, 3).map((segmentId, index) => {
                      const segment = segments.find(s => s.id === segmentId)
                      return (
                        <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {segment?.name || segmentId}
                        </span>
                      )
                    })}
                    {campaign.targetSegments.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{campaign.targetSegments.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Open Rate</p>
                    <p className="font-semibold text-blue-600">{campaign.performance.openRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Click Rate</p>
                    <p className="font-semibold text-green-600">{campaign.performance.clickRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Conversion</p>
                    <p className="font-semibold text-purple-600">{campaign.performance.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ROI</p>
                    <p className="font-semibold text-orange-600">{campaign.performance.roi.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium">{formatDate(campaign.schedule.startDate)}</span>
                </div>
              </div>
            </motion.div>
          ))}
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
            <h3 className="font-semibold text-red-800">Segmentation System Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchSegmentationData}
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
          <h2 className="text-2xl font-bold text-gray-900">Advanced Segmentation Tools</h2>
          <p className="text-gray-600">Sophisticated lead segmentation and targeting system</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSegmentBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            Create Segment
          </button>
          <button
            onClick={fetchSegmentationData}
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
          onClick={() => setViewMode('segments')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'segments' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Segments
        </button>
        <button
          onClick={() => setViewMode('campaigns')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'campaigns' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Campaigns
        </button>
        <button
          onClick={() => setViewMode('rules')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'rules' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Rules
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

        {viewMode === 'segments' && (
          <motion.div
            key="segments"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderSegmentsView()}
          </motion.div>
        )}

        {viewMode === 'campaigns' && (
          <motion.div
            key="campaigns"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderCampaignsView()}
          </motion.div>
        )}

        {viewMode === 'rules' && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-lg p-12 shadow-sm border text-center"
          >
            <Filter className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Segmentation Rules</h3>
            <p className="text-gray-600">Advanced rule builder and management features coming soon...</p>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Segmentation Analytics</h3>
            <p className="text-gray-600">Advanced analytics and performance metrics coming soon...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
