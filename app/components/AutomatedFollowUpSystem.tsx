'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Clock, 
  Mail, 
  MessageSquare, 
  Phone, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  Copy,
  Eye,
  Settings,
  Target,
  TrendingUp,
  Users,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Filter,
  Search,
  RefreshCw,
  Download,
  Upload,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ArrowDown,
  Star,
  Flag,
  Bookmark,
  Share,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Timer,
  Bell,
  AlertTriangle,
  CheckSquare,
  Square,
  Minus,
  Maximize2,
  Minimize2,
  RotateCcw,
  Repeat,
  Shuffle,
  Layers,
  Workflow,
  GitBranch,
  GitCommit,
  GitMerge,
  Code,
  Database,
  Server,
  Cloud,
  Wifi,
  WifiOff,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Battery,
  BatteryCharging,
  Power,
  PowerOff,
  PlayCircle,
  PauseCircle,
  StopCircle,
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
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  Crown,
  Award,
  Trophy,
  Medal,
  Badge,
  Tag,
  Tags,
  Hash,
  AtSign,
  Percent,
  DollarSign,
  CreditCard,
  Banknote,
  Coins,
  Wallet,
  ShoppingCart,
  ShoppingBag,
  Package,
  Truck,
  MapPin,
  Navigation,
  Compass,
  Globe,
  Map,
  Globe2,
  Sun,
  Moon,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Droplets,
  Flame,
  Snowflake,
  Zap as Lightning,
  Lightbulb,
  Monitor,
  Smartphone,
  Tablet,
  Laptop
} from 'lucide-react'

interface FollowUpSequence {
  id: string
  name: string
  description: string
  isActive: boolean
  triggerEvent: 'lead_created' | 'no_response' | 'meeting_scheduled' | 'deal_closed' | 'custom'
  triggerDelay: number
  steps: FollowUpStep[]
  conditions: {
    field: string
    operator: string
    value: any
  }[]
  businessId: string
  createdAt: string
  updatedAt: string
  performance?: {
    totalSent: number
    totalOpened: number
    totalClicked: number
    totalConverted: number
    openRate: number
    clickRate: number
    conversionRate: number
  }
}

interface FollowUpStep {
  id: string
  stepNumber: number
  actionType: 'email' | 'sms' | 'call' | 'task' | 'wait'
  subject?: string
  content: string
  delayHours: number
  isActive: boolean
  templateId?: string
  attachments?: string[]
  metadata?: Record<string, any>
}

interface NurtureCampaign {
  id: string
  name: string
  description: string
  isActive: boolean
  targetSegments: string[]
  sequences: FollowUpSequence[]
  performance: {
    totalSent: number
    totalOpened: number
    totalClicked: number
    totalConverted: number
    openRate: number
    clickRate: number
    conversionRate: number
  }
  businessId: string
  createdAt: string
  updatedAt: string
}

interface Lead {
  id: string
  businessName: string
  contactName: string
  email: string
  phone: string
  status: string
  priority: string
  score: number
  source: string
  assignedTo?: string
  businessId: string
  createdAt: string
  updatedAt: string
}

interface AutomatedFollowUpSystemProps {
  businessId?: string
  autoRefresh?: boolean
}

export default function AutomatedFollowUpSystem({ 
  businessId = 'default',
  autoRefresh = true
}: AutomatedFollowUpSystemProps) {
  const [sequences, setSequences] = useState<FollowUpSequence[]>([])
  const [campaigns, setCampaigns] = useState<NurtureCampaign[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'sequences' | 'campaigns' | 'leads' | 'analytics'>('overview')
  const [selectedSequence, setSelectedSequence] = useState<FollowUpSequence | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<NurtureCampaign | null>(null)
  const [showSequenceBuilder, setShowSequenceBuilder] = useState(false)
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false)
  const [editingSequence, setEditingSequence] = useState<FollowUpSequence | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<NurtureCampaign | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    trigger: 'all',
    search: ''
  })

  // Fetch follow-up data
  const fetchFollowUpData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/automation/follow-up?businessId=${businessId}`)
      const result = await response.json()

      if (result.success) {
        setSequences(result.sequences || [])
        setCampaigns(result.campaigns || [])
      } else {
        setError(result.error || 'Failed to fetch follow-up data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch follow-up data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFollowUpData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchFollowUpData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [businessId, autoRefresh])

  const getActionIcon = (actionType: FollowUpStep['actionType']) => {
    switch (actionType) {
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'sms':
        return <MessageSquare className="w-4 h-4" />
      case 'call':
        return <Phone className="w-4 h-4" />
      case 'task':
        return <CheckSquare className="w-4 h-4" />
      case 'wait':
        return <Clock className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActionColor = (actionType: FollowUpStep['actionType']) => {
    switch (actionType) {
      case 'email':
        return 'text-blue-600 bg-blue-100'
      case 'sms':
        return 'text-green-600 bg-green-100'
      case 'call':
        return 'text-purple-600 bg-purple-100'
      case 'task':
        return 'text-orange-600 bg-orange-100'
      case 'wait':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getTriggerIcon = (triggerEvent: FollowUpSequence['triggerEvent']) => {
    switch (triggerEvent) {
      case 'lead_created':
        return <UserPlus className="w-4 h-4" />
      case 'no_response':
        return <AlertTriangle className="w-4 h-4" />
      case 'meeting_scheduled':
        return <Calendar className="w-4 h-4" />
      case 'deal_closed':
        return <CheckCircle className="w-4 h-4" />
      case 'custom':
        return <Settings className="w-4 h-4" />
      default:
        return <Zap className="w-4 h-4" />
    }
  }

  const formatDelay = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`
    } else if (hours < 168) { // 7 days
      return `${Math.floor(hours / 24)}d`
    } else {
      return `${Math.floor(hours / 168)}w`
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

  const filteredSequences = sequences.filter(sequence => {
    if (filters.status !== 'all' && sequence.isActive !== (filters.status === 'active')) return false
    if (filters.trigger !== 'all' && sequence.triggerEvent !== filters.trigger) return false
    if (filters.search && !sequence.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const renderOverview = () => {
    const totalSequences = sequences.length
    const activeSequences = sequences.filter(s => s.isActive).length
    const totalCampaigns = campaigns.length
    const activeCampaigns = campaigns.filter(c => c.isActive).length

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Workflow className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sequences</p>
                <p className="text-xl font-bold text-gray-900">{totalSequences}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Sequences</p>
                <p className="text-xl font-bold text-gray-900">{activeSequences}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
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

        {/* Recent Sequences */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sequences</h3>
          <div className="space-y-3">
            {sequences.slice(0, 5).map((sequence) => (
              <motion.div
                key={sequence.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setSelectedSequence(sequence)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${sequence.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {getTriggerIcon(sequence.triggerEvent)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{sequence.name}</p>
                    <p className="text-sm text-gray-600">{sequence.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${sequence.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {sequence.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {sequence.steps.length} steps
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(sequence.createdAt)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h3>
          <div className="space-y-4">
            {campaigns.slice(0, 3).map((campaign) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${campaign.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Target className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{campaign.name}</p>
                    <p className="text-sm text-gray-600">{campaign.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Open Rate</p>
                    <p className="font-semibold text-blue-600">{campaign.performance.openRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Click Rate</p>
                    <p className="font-semibold text-green-600">{campaign.performance.clickRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Conversion</p>
                    <p className="font-semibold text-purple-600">{campaign.performance.conversionRate.toFixed(1)}%</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderSequencesView = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Follow-up Sequences</h3>
          <button
            onClick={() => setShowSequenceBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Sequence
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search sequences..."
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
              value={filters.trigger}
              onChange={(e) => setFilters({ ...filters, trigger: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Triggers</option>
              <option value="lead_created">Lead Created</option>
              <option value="no_response">No Response</option>
              <option value="meeting_scheduled">Meeting Scheduled</option>
              <option value="deal_closed">Deal Closed</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Sequences Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSequences.map((sequence) => (
            <motion.div
              key={sequence.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${sequence.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {getTriggerIcon(sequence.triggerEvent)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{sequence.name}</h4>
                    <p className="text-sm text-gray-600">{sequence.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingSequence(sequence)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <span className={`px-2 py-1 text-xs rounded-full ${sequence.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {sequence.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Sequence Steps</p>
                  <div className="space-y-2">
                    {sequence.steps.slice(0, 3).map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {step.stepNumber}
                        </span>
                        <div className={`p-1 rounded ${getActionColor(step.actionType)}`}>
                          {getActionIcon(step.actionType)}
                        </div>
                        <span className="text-gray-700">{step.actionType}</span>
                        <span className="text-gray-500">+{formatDelay(step.delayHours)}</span>
                      </div>
                    ))}
                    {sequence.steps.length > 3 && (
                      <div className="text-sm text-gray-500 ml-8">
                        +{sequence.steps.length - 3} more steps
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Trigger:</span>
                  <span className="font-medium capitalize">{sequence.triggerEvent.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Delay:</span>
                  <span className="font-medium">{formatDelay(sequence.triggerDelay)}</span>
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
          <h3 className="text-lg font-semibold text-gray-900">Nurture Campaigns</h3>
          <button
            onClick={() => setShowCampaignBuilder(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${campaign.isActive ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    <Target className="w-5 h-5 text-gray-600" />
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
                  <span className={`px-2 py-1 text-xs rounded-full ${campaign.isActive ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                    {campaign.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Target Segments</p>
                  <div className="flex flex-wrap gap-1">
                    {campaign.targetSegments.slice(0, 3).map((segment, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        {segment}
                      </span>
                    ))}
                    {campaign.targetSegments.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{campaign.targetSegments.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
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
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Sequences:</span>
                  <span className="font-medium">{campaign.sequences.length}</span>
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
            <h3 className="font-semibold text-red-800">Follow-up System Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchFollowUpData}
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
          <h2 className="text-2xl font-bold text-gray-900">Automated Follow-up System</h2>
          <p className="text-gray-600">AI-powered lead nurturing and engagement automation</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSequenceBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage Sequences
          </button>
          <button
            onClick={fetchFollowUpData}
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
          onClick={() => setViewMode('sequences')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'sequences' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Sequences
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

        {viewMode === 'sequences' && (
          <motion.div
            key="sequences"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderSequencesView()}
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

        {viewMode === 'leads' && (
          <motion.div
            key="leads"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-lg p-12 shadow-sm border text-center"
          >
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lead Management</h3>
            <p className="text-gray-600">Lead tracking and management features coming soon...</p>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Follow-up Analytics</h3>
            <p className="text-gray-600">Advanced analytics and performance metrics coming soon...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sequence Detail Modal */}
      <AnimatePresence>
        {selectedSequence && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{selectedSequence.name}</h3>
                <button
                  onClick={() => setSelectedSequence(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${selectedSequence.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {selectedSequence.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {selectedSequence.triggerEvent.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Delay</label>
                    <p className="text-sm text-gray-900">{formatDelay(selectedSequence.triggerDelay)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Steps</label>
                    <p className="text-sm text-gray-900">{selectedSequence.steps.length}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedSequence.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sequence Steps</label>
                  <div className="space-y-3">
                    {selectedSequence.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {step.stepNumber}
                        </span>
                        <div className={`p-2 rounded ${getActionColor(step.actionType)}`}>
                          {getActionIcon(step.actionType)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{step.actionType}</p>
                          {step.subject && (
                            <p className="text-sm text-gray-600">{step.subject}</p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          +{formatDelay(step.delayHours)}
                        </span>
                      </div>
                    ))}
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
