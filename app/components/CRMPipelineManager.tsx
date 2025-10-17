'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Workflow, 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Filter,
  Search,
  RefreshCw,
  Download,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Play,
  Pause,
  RotateCcw,
  Save,
  X,
  Copy,
  Share,
  MoreHorizontal,
  Calendar,
  Timer,
  Bell,
  Flag,
  Bookmark,
  Tag,
  Tags,
  Hash,
  AtSign,
  Percent,
  Activity,
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
  Zap,
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
  Mail,
  MessageSquare,
  Phone,
  Video,
  Camera,
  Image,
  FileText,
  File,
  Folder,
  FolderOpen,
  Archive,
  ArchiveRestore,
  Trash,
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
  RectangleHorizontal as RectangleHorizontalIcon,
  RectangleVertical as RectangleVerticalIcon
} from 'lucide-react'

interface PipelineStage {
  id: string
  name: string
  description: string
  position: number
  color: string
  isActive: boolean
  isDefault: boolean
  criteria: {
    field: string
    operator: string
    value: any
  }[]
  automationRules: {
    trigger: string
    action: string
    conditions: any[]
  }[]
  businessId: string
  createdAt: string
  updatedAt: string
}

interface Pipeline {
  id: string
  name: string
  description: string
  isActive: boolean
  isDefault: boolean
  stages: PipelineStage[]
  settings: {
    allowStageSkipping: boolean
    requireApproval: boolean
    autoAdvance: boolean
    notifications: boolean
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
  currentStage?: string
  pipelineId?: string
  estimatedValue: number
  probability: number
  expectedCloseDate?: string
  lastActivity?: string
  businessId: string
  createdAt: string
  updatedAt: string
}

interface PipelineAnalytics {
  totalLeads: number
  stageDistribution: Array<{
    stageId: string
    stageName: string
    leadCount: number
    percentage: number
    totalValue: number
    averageValue: number
  }>
  conversionRates: Array<{
    fromStage: string
    toStage: string
    rate: number
    count: number
  }>
  averageStageTime: Array<{
    stageId: string
    stageName: string
    averageDays: number
  }>
  velocityMetrics: {
    averageDealVelocity: number
    fastestDeal: number
    slowestDeal: number
    medianDealTime: number
  }
  revenueMetrics: {
    totalPipelineValue: number
    weightedPipelineValue: number
    expectedRevenue: number
    closedWonRevenue: number
  }
}

interface CRMPipelineManagerProps {
  businessId?: string
  autoRefresh?: boolean
}

export default function CRMPipelineManager({ 
  businessId = 'default',
  autoRefresh = true
}: CRMPipelineManagerProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [analytics, setAnalytics] = useState<PipelineAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'pipelines' | 'stages' | 'leads' | 'analytics'>('overview')
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [showPipelineBuilder, setShowPipelineBuilder] = useState(false)
  const [showStageBuilder, setShowStageBuilder] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assigned_to: 'all',
    search: ''
  })

  // Fetch pipeline data
  const fetchPipelineData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/crm/pipeline?businessId=${businessId}&includeAnalytics=true`)
      const result = await response.json()

      if (result.success) {
        setPipelines(result.pipelines || [])
        setAnalytics(result.analytics || null)
      } else {
        setError(result.error || 'Failed to fetch pipeline data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPipelineData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchPipelineData, 60000) // Refresh every minute
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

  const getPriorityColor = (priority: string) => {
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

  const getStageColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'blue': 'bg-blue-100 text-blue-800',
      'green': 'bg-green-100 text-green-800',
      'yellow': 'bg-yellow-100 text-yellow-800',
      'red': 'bg-red-100 text-red-800',
      'purple': 'bg-purple-100 text-purple-800',
      'pink': 'bg-pink-100 text-pink-800',
      'indigo': 'bg-indigo-100 text-indigo-800',
      'gray': 'bg-gray-100 text-gray-800'
    }
    return colorMap[color] || 'bg-gray-100 text-gray-800'
  }

  const filteredLeads = leads.filter(lead => {
    if (filters.status !== 'all' && lead.status !== filters.status) return false
    if (filters.priority !== 'all' && lead.priority !== filters.priority) return false
    if (filters.assigned_to !== 'all' && lead.assignedTo !== filters.assigned_to) return false
    if (filters.search && !lead.businessName.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const renderOverview = () => {
    const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]
    const totalPipelines = pipelines.length
    const activePipelines = pipelines.filter(p => p.isActive).length

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
                <p className="text-sm text-gray-600">Total Pipelines</p>
                <p className="text-xl font-bold text-gray-900">{totalPipelines}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Pipelines</p>
                <p className="text-xl font-bold text-gray-900">{activePipelines}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-xl font-bold text-gray-900">{analytics?.totalLeads || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pipeline Value</p>
                <p className="text-xl font-bold text-gray-900">
                  {analytics ? formatCurrency(analytics.revenueMetrics.totalPipelineValue) : '$0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Visualization */}
        {defaultPipeline && (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h3>
            <div className="flex items-center gap-4 overflow-x-auto pb-4">
              {defaultPipeline.stages.map((stage, index) => {
                const stageLeads = analytics?.stageDistribution.find(s => s.stageId === stage.id)
                const leadCount = stageLeads?.leadCount || 0
                const totalValue = stageLeads?.totalValue || 0

                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col items-center min-w-[200px]"
                  >
                    <div className={`w-full h-2 rounded-full ${getStageColor(stage.color).split(' ')[0]} mb-3`} />
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900">{stage.name}</h4>
                      <p className="text-sm text-gray-600">{leadCount} leads</p>
                      <p className="text-sm font-medium text-green-600">{formatCurrency(totalValue)}</p>
                    </div>
                    {index < defaultPipeline.stages.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-gray-400 mt-2" />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Revenue Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Pipeline Value</span>
                  <span className="font-semibold">{formatCurrency(analytics.revenueMetrics.totalPipelineValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected Revenue</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(analytics.revenueMetrics.expectedRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Closed Won</span>
                  <span className="font-semibold text-green-600">{formatCurrency(analytics.revenueMetrics.closedWonRevenue)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Velocity Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Deal Velocity</span>
                  <span className="font-semibold">{analytics.velocityMetrics.averageDealVelocity} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fastest Deal</span>
                  <span className="font-semibold text-green-600">{analytics.velocityMetrics.fastestDeal} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Slowest Deal</span>
                  <span className="font-semibold text-red-600">{analytics.velocityMetrics.slowestDeal} days</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rates</h3>
              <div className="space-y-3">
                {analytics.conversionRates.slice(0, 3).map((rate, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600 text-sm">{rate.fromStage} → {rate.toStage}</span>
                    <span className="font-semibold">{rate.rate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderPipelinesView = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">CRM Pipelines</h3>
          <button
            onClick={() => setShowPipelineBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Pipeline
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pipelines.map((pipeline) => (
            <motion.div
              key={pipeline.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${pipeline.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Workflow className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{pipeline.name}</h4>
                    <p className="text-sm text-gray-600">{pipeline.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingPipeline(pipeline)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {pipeline.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs rounded-full ${pipeline.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {pipeline.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Pipeline Stages</p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {pipeline.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStageColor(stage.color)}`}>
                          {stage.name}
                        </span>
                        {index < pipeline.stages.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Stages:</span>
                    <span className="font-medium ml-1">{pipeline.stages.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Auto-advance:</span>
                    <span className={`font-medium ml-1 ${pipeline.settings.autoAdvance ? 'text-green-600' : 'text-gray-600'}`}>
                      {pipeline.settings.autoAdvance ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{formatDate(pipeline.createdAt)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const renderStagesView = () => {
    const defaultPipeline = pipelines.find(p => p.isDefault) || pipelines[0]
    
    if (!defaultPipeline) {
      return (
        <div className="bg-white rounded-lg p-12 shadow-sm border text-center">
          <Workflow className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pipeline Selected</h3>
          <p className="text-gray-600">Create a pipeline to manage stages</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Pipeline Stages</h3>
            <p className="text-sm text-gray-600">{defaultPipeline.name}</p>
          </div>
          <button
            onClick={() => setShowStageBuilder(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Stage
          </button>
        </div>

        <div className="space-y-4">
          {defaultPipeline.stages.map((stage, index) => {
            const stageAnalytics = analytics?.stageDistribution.find(s => s.stageId === stage.id)
            
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{stage.name}</h4>
                      <p className="text-sm text-gray-600">{stage.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingStage(stage)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStageColor(stage.color)}`}>
                      {stage.color}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Leads in Stage</p>
                    <p className="text-2xl font-bold text-gray-900">{stageAnalytics?.leadCount || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stageAnalytics ? formatCurrency(stageAnalytics.totalValue) : '$0'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Avg Value</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {stageAnalytics ? formatCurrency(stageAnalytics.averageValue) : '$0'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
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
            <h3 className="font-semibold text-red-800">Pipeline System Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchPipelineData}
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
          <h2 className="text-2xl font-bold text-gray-900">CRM Pipeline Manager</h2>
          <p className="text-gray-600">Comprehensive pipeline management and lead tracking system</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPipelineBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage Pipelines
          </button>
          <button
            onClick={fetchPipelineData}
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
          onClick={() => setViewMode('pipelines')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'pipelines' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Pipelines
        </button>
        <button
          onClick={() => setViewMode('stages')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'stages' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Stages
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

        {viewMode === 'pipelines' && (
          <motion.div
            key="pipelines"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderPipelinesView()}
          </motion.div>
        )}

        {viewMode === 'stages' && (
          <motion.div
            key="stages"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderStagesView()}
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Pipeline Analytics</h3>
            <p className="text-gray-600">Advanced analytics and performance metrics coming soon...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
