'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  BarChart3, 
  PieChart,
  Users,
  Clock,
  Calendar,
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
  RefreshCw,
  Download,
  Upload,
  Share,
  Copy,
  MoreHorizontal,
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
  Info,
  HelpCircle,
  Star,
  Flag,
  Bookmark,
  Tag,
  Tags,
  Hash,
  AtSign,
  Percent,
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
  Printer,
  Keyboard,
  Mouse,
  Headphones,
  Speaker,
  Radio,
  Gamepad2,
  Joystick,
  Puzzle,
  Heart,
  Club,
  Spade,
  Star as StarIcon,
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
  Timer,
  Bell,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  FastForward,
  Rewind,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Camera,
  CameraOff,
  Image,
  RotateCcw,
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
  Mail,
  MessageSquare,
  Phone,
  Activity,
  Database,
  Server,
  Cloud as CloudIcon,
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
  StopCircle
} from 'lucide-react'

interface AttributionModel {
  id: string
  name: string
  description: string
  modelType: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' | 'custom'
  weights: Record<string, number>
  isDefault: boolean
  businessId: string
  createdAt: string
  updatedAt: string
}

interface LeadSource {
  id: string
  name: string
  type: 'organic' | 'paid' | 'social' | 'email' | 'referral' | 'direct' | 'other'
  category: string
  subcategory?: string
  cost: number
  isActive: boolean
  businessId: string
  createdAt: string
  updatedAt: string
}

interface AttributionData {
  leadId: string
  touchpoints: Array<{
    source: string
    medium: string
    campaign?: string
    timestamp: string
    value: number
    interactionType: 'visit' | 'click' | 'form_submit' | 'call' | 'email_open' | 'email_click'
  }>
  attributionScore: number
  attributedSource: string
  attributedValue: number
  conversionPath: string[]
  totalTouchpoints: number
  daysToConversion: number
}

interface ROIMetrics {
  sourceId: string
  sourceName: string
  totalCost: number
  totalLeads: number
  totalConversions: number
  totalRevenue: number
  costPerLead: number
  costPerConversion: number
  revenuePerLead: number
  roi: number
  conversionRate: number
  averageDealSize: number
  paybackPeriod: number
  lifetimeValue: number
  attributionWeight: number
}

interface AttributionAnalytics {
  totalRevenue: number
  totalCost: number
  overallROI: number
  sourcePerformance: ROIMetrics[]
  attributionBreakdown: Array<{
    sourceId: string
    sourceName: string
    attributedRevenue: number
    attributedLeads: number
    attributionPercentage: number
  }>
  conversionPaths: Array<{
    path: string[]
    frequency: number
    averageValue: number
    conversionRate: number
  }>
  timeToConversion: {
    average: number
    median: number
    p25: number
    p75: number
  }
  channelEffectiveness: Array<{
    channel: string
    totalTouchpoints: number
    uniqueLeads: number
    conversions: number
    revenue: number
    effectiveness: number
  }>
}

interface LeadAttributionROIProps {
  businessId?: string
  autoRefresh?: boolean
}

export default function LeadAttributionROI({ 
  businessId = 'default',
  autoRefresh = true
}: LeadAttributionROIProps) {
  const [models, setModels] = useState<AttributionModel[]>([])
  const [sources, setSources] = useState<LeadSource[]>([])
  const [attributionData, setAttributionData] = useState<AttributionData[]>([])
  const [analytics, setAnalytics] = useState<AttributionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'sources' | 'models' | 'roi' | 'attribution'>('overview')
  const [selectedModel, setSelectedModel] = useState<AttributionModel | null>(null)
  const [selectedSource, setSelectedSource] = useState<LeadSource | null>(null)
  const [showModelBuilder, setShowModelBuilder] = useState(false)
  const [showSourceBuilder, setShowSourceBuilder] = useState(false)
  const [editingModel, setEditingModel] = useState<AttributionModel | null>(null)
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    model: 'last_touch',
    search: ''
  })

  // Fetch attribution data
  const fetchAttributionData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        businessId,
        includeAnalytics: 'true',
        attributionModel: filters.model
      })

      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom)
      }

      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo)
      }

      const response = await fetch(`/api/analytics/attribution?${params}`)
      const result = await response.json()

      if (result.success) {
        setModels(result.models || [])
        setSources(result.sources || [])
        setAttributionData(result.attributionData || [])
        setAnalytics(result.analytics || null)
      } else {
        setError(result.error || 'Failed to fetch attribution data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attribution data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttributionData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchAttributionData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [businessId, filters, autoRefresh])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getSourceTypeIcon = (type: LeadSource['type']) => {
    switch (type) {
      case 'organic':
        return <Globe className="w-4 h-4" />
      case 'paid':
        return <DollarSign className="w-4 h-4" />
      case 'social':
        return <Users className="w-4 h-4" />
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'referral':
        return <ArrowRight className="w-4 h-4" />
      case 'direct':
        return <Target className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getSourceTypeColor = (type: LeadSource['type']) => {
    switch (type) {
      case 'organic':
        return 'text-green-600 bg-green-100'
      case 'paid':
        return 'text-blue-600 bg-blue-100'
      case 'social':
        return 'text-purple-600 bg-purple-100'
      case 'email':
        return 'text-orange-600 bg-orange-100'
      case 'referral':
        return 'text-pink-600 bg-pink-100'
      case 'direct':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getROIColor = (roi: number) => {
    if (roi > 300) return 'text-green-600'
    if (roi > 100) return 'text-blue-600'
    if (roi > 0) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredSources = sources.filter(source => {
    if (filters.search && !source.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const renderOverview = () => {
    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">
                  {analytics ? formatCurrency(analytics.totalRevenue) : '$0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-xl font-bold text-gray-900">
                  {analytics ? formatCurrency(analytics.totalCost) : '$0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overall ROI</p>
                <p className={`text-xl font-bold ${getROIColor(analytics?.overallROI || 0)}`}>
                  {analytics ? formatPercentage(analytics.overallROI) : '0%'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Lead Sources</p>
                <p className="text-xl font-bold text-gray-900">{sources.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Sources */}
        {analytics && (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Sources</h3>
            <div className="space-y-4">
              {analytics.sourcePerformance.slice(0, 5).map((source) => (
                <div key={source.sourceId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{source.sourceName}</p>
                      <p className="text-sm text-gray-600">{source.totalLeads} leads, {source.totalConversions} conversions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="font-semibold text-green-600">{formatCurrency(source.totalRevenue)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">ROI</p>
                      <p className={`font-semibold ${getROIColor(source.roi)}`}>
                        {formatPercentage(source.roi)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Cost/Lead</p>
                      <p className="font-semibold">{formatCurrency(source.costPerLead)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attribution Breakdown */}
        {analytics && (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attribution Breakdown</h3>
            <div className="space-y-3">
              {analytics.attributionBreakdown.slice(0, 8).map((item) => (
                <div key={item.sourceId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-gray-900">{item.sourceName}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-600">
                      {formatCurrency(item.attributedRevenue)}
                    </span>
                    <span className="text-sm font-medium text-blue-600">
                      {formatPercentage(item.attributionPercentage)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time to Conversion */}
        {analytics && (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Time to Conversion</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Average</p>
                <p className="text-xl font-bold text-gray-900">{analytics.timeToConversion.average} days</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Median</p>
                <p className="text-xl font-bold text-blue-600">{analytics.timeToConversion.median} days</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">25th Percentile</p>
                <p className="text-xl font-bold text-green-600">{analytics.timeToConversion.p25} days</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">75th Percentile</p>
                <p className="text-xl font-bold text-purple-600">{analytics.timeToConversion.p75} days</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSourcesView = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Lead Sources</h3>
          <button
            onClick={() => setShowSourceBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Source
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search sources..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <input
              type="date"
              placeholder="From Date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="date"
              placeholder="To Date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sources Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSources.map((source) => {
            const sourceAnalytics = analytics?.sourcePerformance.find(s => s.sourceId === source.id)
            
            return (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${source.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {getSourceTypeIcon(source.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{source.name}</h4>
                      <p className="text-sm text-gray-600">{source.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingSource(source)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <span className={`px-2 py-1 text-xs rounded-full ${getSourceTypeColor(source.type)}`}>
                      {source.type}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Total Cost</p>
                      <p className="font-semibold text-red-600">{formatCurrency(source.cost)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Total Leads</p>
                      <p className="font-semibold text-blue-600">{sourceAnalytics?.totalLeads || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Conversions</p>
                      <p className="font-semibold text-green-600">{sourceAnalytics?.totalConversions || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="font-semibold text-purple-600">
                        {sourceAnalytics ? formatCurrency(sourceAnalytics.totalRevenue) : '$0'}
                      </p>
                    </div>
                  </div>

                  {sourceAnalytics && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">ROI:</span>
                        <span className={`font-semibold ${getROIColor(sourceAnalytics.roi)}`}>
                          {formatPercentage(sourceAnalytics.roi)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Cost per Lead:</span>
                        <span className="font-semibold">{formatCurrency(sourceAnalytics.costPerLead)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Conversion Rate:</span>
                        <span className="font-semibold text-green-600">
                          {formatPercentage(sourceAnalytics.conversionRate)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderModelsView = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Attribution Models</h3>
          <button
            onClick={() => setShowModelBuilder(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Model
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {models.map((model) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${model.isDefault ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    <Target className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{model.name}</h4>
                    <p className="text-sm text-gray-600">{model.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingModel(model)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {model.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Model Type</p>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {model.modelType.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Weights</p>
                  <div className="space-y-1">
                    {Object.entries(model.weights).slice(0, 3).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                    {Object.keys(model.weights).length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{Object.keys(model.weights).length - 3} more weights
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{formatDate(model.createdAt)}</span>
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
            <h3 className="font-semibold text-red-800">Attribution System Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchAttributionData}
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
          <h2 className="text-2xl font-bold text-gray-900">Lead Attribution & ROI Tracking</h2>
          <p className="text-gray-600">Comprehensive attribution analysis and ROI measurement</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSourceBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            Add Source
          </button>
          <button
            onClick={fetchAttributionData}
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
          onClick={() => setViewMode('sources')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'sources' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Sources
        </button>
        <button
          onClick={() => setViewMode('models')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'models' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Models
        </button>
        <button
          onClick={() => setViewMode('roi')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'roi' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          ROI Analysis
        </button>
        <button
          onClick={() => setViewMode('attribution')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'attribution' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Attribution
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

        {viewMode === 'sources' && (
          <motion.div
            key="sources"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderSourcesView()}
          </motion.div>
        )}

        {viewMode === 'models' && (
          <motion.div
            key="models"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderModelsView()}
          </motion.div>
        )}

        {viewMode === 'roi' && (
          <motion.div
            key="roi"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-lg p-12 shadow-sm border text-center"
          >
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">ROI Analysis</h3>
            <p className="text-gray-600">Advanced ROI analysis and reporting features coming soon...</p>
          </motion.div>
        )}

        {viewMode === 'attribution' && (
          <motion.div
            key="attribution"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-lg p-12 shadow-sm border text-center"
          >
            <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Attribution Analysis</h3>
            <p className="text-gray-600">Advanced attribution modeling and analysis features coming soon...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
