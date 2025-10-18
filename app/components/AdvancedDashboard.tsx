'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Phone, 
  Calendar,
  DollarSign,
  Settings,
  RefreshCw,
  Download,
  Share,
  Bell,
  Eye,
  EyeOff,
  Plus,
  X,
  Grid,
  List,
  Filter,
  Search,
  Bookmark,
  Star,
  Target,
  Zap,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ArrowDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

// Import all our analytics components
import AdvancedAnalytics from './AdvancedAnalytics'
import RealTimeCallMonitor from './RealTimeCallMonitor'
import InteractiveCharts from './InteractiveCharts'
import LeadConversionTracker from './LeadConversionTracker'
import PerformanceBenchmarking from './PerformanceBenchmarking'
import AutomatedInsights from './AutomatedInsights'

interface DashboardWidget {
  id: string
  type: 'analytics' | 'calls' | 'charts' | 'conversion' | 'benchmarking' | 'insights' | 'kpi' | 'custom'
  title: string
  description: string
  size: 'small' | 'medium' | 'large' | 'full'
  position: { x: number; y: number }
  isVisible: boolean
  isPinned: boolean
  isBookmarked: boolean
  settings: Record<string, any>
  icon: React.ReactNode
}

interface DashboardLayout {
  id: string
  name: string
  description: string
  isDefault: boolean
  widgets: DashboardWidget[]
  createdAt: Date
  updatedAt: Date
}

interface AdvancedDashboardProps {
  businessId?: string
  userId?: string
  autoRefresh?: boolean
}

export default function AdvancedDashboard({ 
  businessId = 'default',
  userId = 'default',
  autoRefresh = true
}: AdvancedDashboardProps) {
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(null)
  const [layouts, setLayouts] = useState<DashboardLayout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid')
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false)
  const [filters, setFilters] = useState({
    timeframe: '30d',
    category: 'all',
    search: ''
  })
  const [notifications, setNotifications] = useState({
    unreadInsights: 0,
    alerts: 0,
    updates: 0
  })

  // Default widgets configuration
  const defaultWidgets: DashboardWidget[] = [
    {
      id: 'widget_1',
      type: 'kpi',
      title: 'Key Performance Indicators',
      description: 'Overview of critical business metrics',
      size: 'large',
      position: { x: 0, y: 0 },
      isVisible: true,
      isPinned: true,
      isBookmarked: false,
      settings: { timeframe: '30d', metrics: ['revenue', 'calls', 'appointments', 'satisfaction'] },
      icon: <BarChart3 className="w-5 h-5" />
    },
    {
      id: 'widget_2',
      type: 'analytics',
      title: 'Advanced Analytics',
      description: 'Comprehensive analytics and metrics',
      size: 'full',
      position: { x: 0, y: 1 },
      isVisible: true,
      isPinned: false,
      isBookmarked: false,
      settings: { timeframe: '30d', autoRefresh: true },
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      id: 'widget_3',
      type: 'calls',
      title: 'Real-Time Call Monitor',
      description: 'Live call monitoring and analytics',
      size: 'large',
      position: { x: 0, y: 2 },
      isVisible: true,
      isPinned: false,
      isBookmarked: false,
      settings: { autoRefresh: true, refreshInterval: 2000 },
      icon: <Phone className="w-5 h-5" />
    },
    {
      id: 'widget_4',
      type: 'conversion',
      title: 'Lead Conversion Tracker',
      description: 'Track and optimize lead conversion funnel',
      size: 'large',
      position: { x: 1, y: 0 },
      isVisible: true,
      isPinned: false,
      isBookmarked: false,
      settings: { timeframe: '30d', viewMode: 'funnel' },
      icon: <Target className="w-5 h-5" />
    },
    {
      id: 'widget_5',
      type: 'charts',
      title: 'Interactive Charts',
      description: 'Visualize data with interactive charts',
      size: 'medium',
      position: { x: 1, y: 1 },
      isVisible: true,
      isPinned: false,
      isBookmarked: false,
      settings: { timeframe: '30d', autoRefresh: true },
      icon: <BarChart3 className="w-5 h-5" />
    },
    {
      id: 'widget_6',
      type: 'benchmarking',
      title: 'Performance Benchmarking',
      description: 'Compare performance against industry standards',
      size: 'medium',
      position: { x: 1, y: 2 },
      isVisible: true,
      isPinned: false,
      isBookmarked: false,
      settings: { timeframe: '30d', benchmarkType: 'industry' },
      icon: <Activity className="w-5 h-5" />
    },
    {
      id: 'widget_7',
      type: 'insights',
      title: 'Automated Insights',
      description: 'AI-powered insights and recommendations',
      size: 'full',
      position: { x: 0, y: 3 },
      isVisible: true,
      isPinned: true,
      isBookmarked: false,
      settings: { timeframe: '30d', autoRefresh: true, viewMode: 'priority' },
      icon: <Zap className="w-5 h-5" />
    }
  ]

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/dashboard/advanced?businessId=${businessId}&userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        setLayouts(result.layouts || [])
        setCurrentLayout(result.currentLayout || createDefaultLayout())
        setNotifications(result.notifications || { unreadInsights: 0, alerts: 0, updates: 0 })
      } else {
        setCurrentLayout(createDefaultLayout())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
      setCurrentLayout(createDefaultLayout())
    } finally {
      setLoading(false)
    }
  }

  const createDefaultLayout = (): DashboardLayout => ({
    id: 'default_layout',
    name: 'Default Dashboard',
    description: 'Standard dashboard layout with essential widgets',
    isDefault: true,
    widgets: defaultWidgets,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  useEffect(() => {
    fetchDashboardData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 300000) // Refresh every 5 minutes
      return () => clearInterval(interval)
    }
  }, [businessId, userId, autoRefresh])

  const renderWidget = (widget: DashboardWidget) => {
    const commonProps = {
      businessId,
      timeframe: filters.timeframe as '7d' | '30d' | '90d' | '1y',
      autoRefresh
    }

    switch (widget.type) {
      case 'analytics':
        return <AdvancedAnalytics {...commonProps} />
      case 'calls':
        return <RealTimeCallMonitor {...commonProps} />
      case 'charts':
        return <InteractiveCharts {...commonProps} />
      case 'conversion':
        return <LeadConversionTracker {...commonProps} />
      case 'benchmarking':
        return <PerformanceBenchmarking {...commonProps} />
      case 'insights':
        return <AutomatedInsights {...commonProps} />
      case 'kpi':
        return renderKPICard(widget)
      default:
        return (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
            <p className="text-gray-600">{widget.description}</p>
            <div className="mt-4 text-center text-gray-400">
              Widget content coming soon...
            </div>
          </div>
        )
    }
  }

  const renderKPICard = (widget: DashboardWidget) => {
    // Mock KPI data
    const kpis = [
      { label: 'Total Revenue', value: '$125,430', change: '+12.5%', trend: 'up', color: 'green' },
      { label: 'Total Calls', value: '1,847', change: '+8.2%', trend: 'up', color: 'blue' },
      { label: 'Appointments', value: '234', change: '+15.3%', trend: 'up', color: 'purple' },
      { label: 'Satisfaction', value: '4.7/5', change: '+0.3', trend: 'up', color: 'yellow' }
    ]

    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{widget.title}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-4 bg-gray-50 rounded-lg"
            >
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-sm text-gray-600 mb-1">{kpi.label}</p>
              <div className={`flex items-center justify-center gap-1 text-sm ${
                kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {kpi.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingUp className="w-3 h-3 rotate-180" />
                )}
                {kpi.change}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const getWidgetSize = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small':
        return 'lg:col-span-1'
      case 'medium':
        return 'lg:col-span-2'
      case 'large':
        return 'lg:col-span-3'
      case 'full':
        return 'lg:col-span-4'
      default:
        return 'lg:col-span-2'
    }
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    if (!currentLayout) return
    
    const updatedWidgets = currentLayout.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, isVisible: !widget.isVisible } : widget
    )
    
    setCurrentLayout({
      ...currentLayout,
      widgets: updatedWidgets,
      updatedAt: new Date()
    })
  }

  const toggleWidgetPin = (widgetId: string) => {
    if (!currentLayout) return
    
    const updatedWidgets = currentLayout.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, isPinned: !widget.isPinned } : widget
    )
    
    setCurrentLayout({
      ...currentLayout,
      widgets: updatedWidgets,
      updatedAt: new Date()
    })
  }

  const toggleWidgetBookmark = (widgetId: string) => {
    if (!currentLayout) return
    
    const updatedWidgets = currentLayout.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, isBookmarked: !widget.isBookmarked } : widget
    )
    
    setCurrentLayout({
      ...currentLayout,
      widgets: updatedWidgets,
      updatedAt: new Date()
    })
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
            <h3 className="font-semibold text-red-800">Dashboard Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!currentLayout) {
    return <div>No dashboard layout found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Dashboard</h1>
          <p className="text-gray-600">Comprehensive analytics and insights for your business</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Notifications */}
          {(notifications.unreadInsights > 0 || notifications.alerts > 0) && (
            <div className="relative">
              <button className="relative p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors">
                <Bell className="w-6 h-6 text-blue-600" />
                {notifications.unreadInsights + notifications.alerts > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.unreadInsights + notifications.alerts}
                  </span>
                )}
              </button>
            </div>
          )}
          
          {/* View Mode */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          {/* Filters */}
          <select
            value={filters.timeframe}
            onChange={(e) => setFilters({ ...filters, timeframe: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          {/* Actions */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {isEditMode ? 'Done' : 'Customize'}
          </button>
          
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Edit Mode Controls */}
      {isEditMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-4 shadow-sm border"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Customize Dashboard</h3>
            <button
              onClick={() => setShowWidgetLibrary(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Widget
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {currentLayout.widgets.map((widget) => (
              <div
                key={widget.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  widget.isVisible ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                {widget.icon}
                <span className="text-sm font-medium">{widget.title}</span>
                <button
                  onClick={() => toggleWidgetVisibility(widget.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {widget.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => toggleWidgetPin(widget.id)}
                  className="text-gray-400 hover:text-yellow-500"
                >
                  <Star className={`w-4 h-4 ${widget.isPinned ? 'fill-current text-yellow-500' : ''}`} />
                </button>
                <button
                  onClick={() => toggleWidgetBookmark(widget.id)}
                  className="text-gray-400 hover:text-blue-500"
                >
                  <Bookmark className={`w-4 h-4 ${widget.isBookmarked ? 'fill-current text-blue-500' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Widget Library Modal */}
      <AnimatePresence>
        {showWidgetLibrary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Widget Library</h3>
                <button
                  onClick={() => setShowWidgetLibrary(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Widget library coming soon...</p>
                <p className="text-sm">Add custom widgets and integrations</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dashboard Content */}
      <div className={`grid grid-cols-1 gap-6 ${
        viewMode === 'grid' ? 'lg:grid-cols-4' : 'lg:grid-cols-1'
      }`}>
        {currentLayout.widgets
          .filter(widget => widget.isVisible)
          .map((widget) => (
            <motion.div
              key={widget.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${getWidgetSize(widget.size)} ${
                selectedWidget === widget.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedWidget(selectedWidget === widget.id ? null : widget.id)}
            >
              {renderWidget(widget)}
            </motion.div>
          ))}
      </div>

      {/* Empty State */}
      {currentLayout.widgets.filter(w => w.isVisible).length === 0 && (
        <div className="bg-white rounded-lg p-12 shadow-sm border text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Widgets Visible</h3>
          <p className="text-gray-600 mb-6">Enable some widgets to start viewing your analytics.</p>
          <button
            onClick={() => setIsEditMode(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Customize Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
