'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  MessageSquare,
  FileText,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Filter,
  Search,
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
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
  Printer,
  Keyboard,
  Mouse,
  Headphones,
  Speaker,
  Radio,
  Tv,
  Gamepad2,
  Joystick,
  Dice4,
  Dice5,
  Dice6,
  Puzzle,
  Heart,
  Diamond,
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
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  Settings,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  KeyRound,
  Fingerprint,
  Calendar as CalendarIcon,
  Timer,
  Bell,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Camera,
  CameraOff,
  Image,
  File,
  Folder,
  FolderOpen,
  Archive,
  ArchiveRestore,
  Trash,
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
  RectangleVertical
} from 'lucide-react'

interface LeadActivity {
  id: string
  leadId: string
  activityType: string
  description: string
  metadata: Record<string, any>
  createdBy?: string
  createdAt: string
  updatedAt: string
  admin_users?: {
    name: string
    email: string
  }
}

interface LeadNote {
  id: string
  leadId: string
  note: string
  noteType: 'general' | 'call_outcome' | 'email_response' | 'meeting' | 'follow_up' | 'research'
  createdBy?: string
  createdAt: string
  updatedAt: string
  admin_users?: {
    name: string
    email: string
  }
}

interface LeadInteraction {
  id: string
  leadId: string
  interactionType: 'call' | 'email' | 'sms' | 'meeting' | 'demo' | 'proposal' | 'contract'
  direction: 'inbound' | 'outbound'
  status: 'completed' | 'scheduled' | 'cancelled' | 'no_answer' | 'voicemail'
  duration?: number
  subject?: string
  content?: string
  outcome?: string
  nextAction?: string
  scheduledAt?: string
  completedAt?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
  admin_users?: {
    name: string
    email: string
  }
}

interface LeadTimeline {
  leadId: string
  activities: LeadActivity[]
  notes: LeadNote[]
  interactions: LeadInteraction[]
  milestones: Array<{
    id: string
    type: string
    title: string
    description: string
    achievedAt: string
    metadata: Record<string, any>
  }>
}

interface ActivityAnalytics {
  totalActivities: number
  activitiesByType: Array<{
    type: string
    count: number
    percentage: number
  }>
  activitiesByUser: Array<{
    userId: string
    userName: string
    count: number
    percentage: number
  }>
  recentActivity: LeadActivity[]
  activityTrends: Array<{
    date: string
    count: number
  }>
  interactionStats: {
    totalInteractions: number
    callsCompleted: number
    emailsSent: number
    meetingsScheduled: number
    averageResponseTime: number
  }
}

interface LeadActivityTrackerProps {
  businessId?: string
  leadId?: string
  autoRefresh?: boolean
}

export default function LeadActivityTracker({ 
  businessId = 'default',
  leadId,
  autoRefresh = true
}: LeadActivityTrackerProps) {
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [notes, setNotes] = useState<LeadNote[]>([])
  const [interactions, setInteractions] = useState<LeadInteraction[]>([])
  const [timeline, setTimeline] = useState<LeadTimeline | null>(null)
  const [analytics, setAnalytics] = useState<ActivityAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'activities' | 'notes' | 'interactions' | 'analytics'>('timeline')
  const [selectedActivity, setSelectedActivity] = useState<LeadActivity | null>(null)
  const [selectedNote, setSelectedNote] = useState<LeadNote | null>(null)
  const [selectedInteraction, setSelectedInteraction] = useState<LeadInteraction | null>(null)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [showInteractionForm, setShowInteractionForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<LeadActivity | null>(null)
  const [editingNote, setEditingNote] = useState<LeadNote | null>(null)
  const [editingInteraction, setEditingInteraction] = useState<LeadInteraction | null>(null)
  const [filters, setFilters] = useState({
    type: 'all',
    user: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  // Fetch activity data
  const fetchActivityData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        businessId,
        includeAnalytics: 'true'
      })

      if (leadId) {
        params.append('leadId', leadId)
      }

      if (filters.type !== 'all') {
        params.append('activityType', filters.type)
      }

      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom)
      }

      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo)
      }

      const response = await fetch(`/api/leads/activity?${params}`)
      const result = await response.json()

      if (result.success) {
        if (leadId && result.timeline) {
          setTimeline(result.timeline)
          setActivities(result.timeline.activities || [])
          setNotes(result.timeline.notes || [])
          setInteractions(result.timeline.interactions || [])
        } else {
          setActivities(result.activities || [])
        }
        setAnalytics(result.analytics || null)
      } else {
        setError(result.error || 'Failed to fetch activity data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivityData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchActivityData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [businessId, leadId, filters, autoRefresh])

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'call':
        return <Phone className="w-4 h-4" />
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'sms':
        return <MessageSquare className="w-4 h-4" />
      case 'meeting':
        return <Calendar className="w-4 h-4" />
      case 'note':
        return <FileText className="w-4 h-4" />
      case 'created':
        return <UserPlus className="w-4 h-4" />
      case 'updated':
        return <Edit className="w-4 h-4" />
      case 'assigned':
        return <UserCheck className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'call':
        return 'text-blue-600 bg-blue-100'
      case 'email':
        return 'text-green-600 bg-green-100'
      case 'sms':
        return 'text-purple-600 bg-purple-100'
      case 'meeting':
        return 'text-orange-600 bg-orange-100'
      case 'note':
        return 'text-gray-600 bg-gray-100'
      case 'created':
        return 'text-green-600 bg-green-100'
      case 'updated':
        return 'text-yellow-600 bg-yellow-100'
      case 'assigned':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getNoteTypeColor = (noteType: LeadNote['noteType']) => {
    switch (noteType) {
      case 'call_outcome':
        return 'text-blue-600 bg-blue-100'
      case 'email_response':
        return 'text-green-600 bg-green-100'
      case 'meeting':
        return 'text-orange-600 bg-orange-100'
      case 'follow_up':
        return 'text-purple-600 bg-purple-100'
      case 'research':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getInteractionStatusColor = (status: LeadInteraction['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'scheduled':
        return 'text-blue-600 bg-blue-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      case 'no_answer':
        return 'text-yellow-600 bg-yellow-100'
      case 'voicemail':
        return 'text-purple-600 bg-purple-100'
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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const filteredActivities = activities.filter(activity => {
    if (filters.user !== 'all' && activity.createdBy !== filters.user) return false
    if (filters.search && !activity.description.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const renderTimeline = () => {
    if (!timeline) {
      return (
        <div className="bg-white rounded-lg p-12 shadow-sm border text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Timeline Available</h3>
          <p className="text-gray-600">Select a lead to view its activity timeline</p>
        </div>
      )
    }

    // Combine all timeline items
    const allItems = [
      ...timeline.activities.map(item => ({ ...item, type: 'activity' })),
      ...timeline.notes.map(item => ({ ...item, type: 'note' })),
      ...timeline.interactions.map(item => ({ ...item, type: 'interaction' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowActivityForm(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Activity
            </button>
            <button
              onClick={() => setShowNoteForm(true)}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Note
            </button>
            <button
              onClick={() => setShowInteractionForm(true)}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Interaction
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {allItems.map((item, index) => (
            <motion.div
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getActivityColor(item.type)}`}>
                  {item.type === 'activity' && getActivityIcon((item as LeadActivity).activityType)}
                  {item.type === 'note' && <FileText className="w-4 h-4" />}
                  {item.type === 'interaction' && getActivityIcon((item as LeadInteraction).interactionType)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {item.type === 'activity' && (item as LeadActivity).activityType}
                        {item.type === 'note' && (item as LeadNote).noteType.replace('_', ' ')}
                        {item.type === 'interaction' && (item as LeadInteraction).interactionType}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.type === 'activity' && (item as LeadActivity).description}
                        {item.type === 'note' && (item as LeadNote).note}
                        {item.type === 'interaction' && (item as LeadInteraction).subject}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatDate(item.createdAt)}
                      </span>
                      <button
                        onClick={() => {
                          if (item.type === 'activity') setSelectedActivity(item as LeadActivity)
                          if (item.type === 'note') setSelectedNote(item as LeadNote)
                          if (item.type === 'interaction') setSelectedInteraction(item as LeadInteraction)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {item.type === 'interaction' && (
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${getInteractionStatusColor((item as LeadInteraction).status)}`}>
                        {(item as LeadInteraction).status}
                      </span>
                      {(item as LeadInteraction).duration && (
                        <span className="text-gray-600">
                          Duration: {formatDuration((item as LeadInteraction).duration)}
                        </span>
                      )}
                    </div>
                  )}

                  {item.admin_users && (
                    <div className="mt-2 text-xs text-gray-500">
                      by {item.admin_users.name}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const renderActivitiesView = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">All Activities</h3>
          <button
            onClick={() => setShowActivityForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Activity
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search activities..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="assigned">Assigned</option>
            </select>

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

        {/* Activities List */}
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedActivity(activity)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getActivityColor(activity.activityType)}`}>
                  {getActivityIcon(activity.activityType)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 capitalize">
                        {activity.activityType.replace('_', ' ')}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                  </div>

                  {activity.admin_users && (
                    <div className="mt-2 text-xs text-gray-500">
                      by {activity.admin_users.name}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const renderAnalytics = () => {
    if (!analytics) {
      return (
        <div className="bg-white rounded-lg p-12 shadow-sm border text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Available</h3>
          <p className="text-gray-600">Analytics will appear when there is activity data</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Activity Analytics</h3>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Activities</p>
                <p className="text-xl font-bold text-gray-900">{analytics.totalActivities}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Calls Completed</p>
                <p className="text-xl font-bold text-gray-900">{analytics.interactionStats.callsCompleted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Emails Sent</p>
                <p className="text-xl font-bold text-gray-900">{analytics.interactionStats.emailsSent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-xl font-bold text-gray-900">{analytics.interactionStats.averageResponseTime}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activities by Type */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Activities by Type</h4>
          <div className="space-y-3">
            {analytics.activitiesByType.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded ${getActivityColor(item.type)}`}>
                    {getActivityIcon(item.type)}
                  </div>
                  <span className="font-medium capitalize">{item.type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
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
            <h3 className="font-semibold text-red-800">Activity Tracker Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchActivityData}
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
          <h2 className="text-2xl font-bold text-gray-900">Lead Activity Tracker</h2>
          <p className="text-gray-600">Comprehensive lead interaction and activity monitoring</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowActivityForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </button>
          <button
            onClick={fetchActivityData}
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
          onClick={() => setViewMode('timeline')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'timeline' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setViewMode('activities')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'activities' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Activities
        </button>
        <button
          onClick={() => setViewMode('notes')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'notes' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Notes
        </button>
        <button
          onClick={() => setViewMode('interactions')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'interactions' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Interactions
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
        {viewMode === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderTimeline()}
          </motion.div>
        )}

        {viewMode === 'activities' && (
          <motion.div
            key="activities"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderActivitiesView()}
          </motion.div>
        )}

        {viewMode === 'notes' && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-lg p-12 shadow-sm border text-center"
          >
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lead Notes</h3>
            <p className="text-gray-600">Note management features coming soon...</p>
          </motion.div>
        )}

        {viewMode === 'interactions' && (
          <motion.div
            key="interactions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-lg p-12 shadow-sm border text-center"
          >
            <Phone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Lead Interactions</h3>
            <p className="text-gray-600">Interaction management features coming soon...</p>
          </motion.div>
        )}

        {viewMode === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderAnalytics()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
