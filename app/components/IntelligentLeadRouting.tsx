'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Target, 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  Settings,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Filter,
  Search,
  Eye,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  Activity,
  BarChart3,
  PieChart,
  Brain,
  Cpu,
  Network,
  Route,
  Navigation,
  MapPin,
  Timer,
  Calendar,
  Bell,
  Star,
  Award,
  Trophy,
  Flag,
  Bookmark,
  Share,
  Download,
  Upload,
  Info,
  HelpCircle
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'sales_rep' | 'sales_manager' | 'account_exec' | 'closer'
  skills: string[]
  specialties: string[]
  currentWorkload: number
  maxCapacity: number
  performance: {
    conversionRate: number
    avgDealSize: number
    responseTime: number
    satisfaction: number
  }
  availability: 'available' | 'busy' | 'unavailable'
  timezone: string
  workingHours: {
    start: string
    end: string
  }
  isActive: boolean
}

interface RoutingRule {
  id: string
  name: string
  description: string
  priority: number
  isActive: boolean
  conditions: {
    field: string
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
    value: any
  }[]
  actions: {
    type: 'assign_to_user' | 'assign_to_team' | 'assign_by_skill' | 'assign_by_workload' | 'assign_by_round_robin'
    value: any
    fallback?: any
  }
  successRate: number
  lastUsed: string
  createdAt: string
}

interface LeadAssignment {
  leadId: string
  businessName: string
  assignedTo?: string
  assignedAt?: string
  assignmentMethod: 'manual' | 'automatic' | 'rule_based' | 'ai_optimized'
  assignmentReason: string
  status: 'pending' | 'assigned' | 'accepted' | 'rejected' | 'reassigned'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  score: number
  skills: string[]
  location: string
  estimatedValue: number
  source: string
  createdAt: string
}

interface RoutingAnalytics {
  totalAssignments: number
  successfulAssignments: number
  averageResponseTime: number
  conversionRate: number
  workloadDistribution: Array<{
    userId: string
    userName: string
    currentLoad: number
    maxCapacity: number
    utilization: number
  }>
  performanceByMethod: Array<{
    method: string
    count: number
    successRate: number
    avgConversion: number
  }>
  timeToAssignment: {
    average: number
    median: number
    p95: number
  }
}

interface IntelligentLeadRoutingProps {
  businessId?: string
  autoRefresh?: boolean
}

export default function IntelligentLeadRouting({ 
  businessId = 'default',
  autoRefresh = true
}: IntelligentLeadRoutingProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([])
  const [assignments, setAssignments] = useState<LeadAssignment[]>([])
  const [analytics, setAnalytics] = useState<RoutingAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'rules' | 'assignments' | 'team' | 'analytics'>('overview')
  const [selectedAssignment, setSelectedAssignment] = useState<LeadAssignment | null>(null)
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    assigned_to: 'all',
    priority: 'all',
    search: ''
  })

  // Fetch routing data
  const fetchRoutingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/leads/routing/intelligent?businessId=${businessId}`)
      const result = await response.json()

      if (result.success) {
        setTeamMembers(result.teamMembers || [])
        setRoutingRules(result.routingRules || [])
        setAssignments(result.assignments || [])
        setAnalytics(result.analytics || null)
      } else {
        setError(result.error || 'Failed to fetch routing data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch routing data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutingData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchRoutingData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [businessId, autoRefresh])

  const getAvailabilityColor = (availability: TeamMember['availability']) => {
    switch (availability) {
      case 'available':
        return 'text-green-600 bg-green-100'
      case 'busy':
        return 'text-yellow-600 bg-yellow-100'
      case 'unavailable':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: LeadAssignment['priority']) => {
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

  const getStatusColor = (status: LeadAssignment['status']) => {
    switch (status) {
      case 'pending':
        return 'text-blue-600 bg-blue-100'
      case 'assigned':
        return 'text-yellow-600 bg-yellow-100'
      case 'accepted':
        return 'text-green-600 bg-green-100'
      case 'rejected':
        return 'text-red-600 bg-red-100'
      case 'reassigned':
        return 'text-purple-600 bg-purple-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getWorkloadColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600'
    if (utilization >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  const filteredAssignments = assignments.filter(assignment => {
    if (filters.status !== 'all' && assignment.status !== filters.status) return false
    if (filters.method !== 'all' && assignment.assignmentMethod !== filters.method) return false
    if (filters.assigned_to !== 'all' && assignment.assignedTo !== filters.assigned_to) return false
    if (filters.priority !== 'all' && assignment.priority !== filters.priority) return false
    if (filters.search && !assignment.businessName.toLowerCase().includes(filters.search.toLowerCase())) return false
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
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Team</p>
                <p className="text-xl font-bold text-gray-900">
                  {teamMembers.filter(member => member.isActive).length}
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
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-xl font-bold text-gray-900">
                  {analytics ? `${(analytics.successfulAssignments / analytics.totalAssignments * 100).toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-xl font-bold text-gray-900">
                  {analytics ? `${analytics.averageResponseTime}m` : '0m'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Conversion</p>
                <p className="text-xl font-bold text-gray-900">
                  {analytics ? `${analytics.conversionRate.toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Workload */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Workload Distribution</h3>
          <div className="space-y-4">
            {analytics?.workloadDistribution.map((member) => (
              <div key={member.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">
                      {member.userName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.userName}</p>
                    <p className="text-sm text-gray-600">
                      {member.currentLoad} / {member.maxCapacity} leads
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        member.utilization >= 90 ? 'bg-red-500' :
                        member.utilization >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${member.utilization}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${getWorkloadColor(member.utilization)}`}>
                    {member.utilization.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Assignments</h3>
          <div className="space-y-3">
            {assignments.slice(0, 5).map((assignment) => (
              <motion.div
                key={assignment.leadId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setSelectedAssignment(assignment)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{assignment.businessName}</p>
                    <p className="text-sm text-gray-600">{assignment.assignmentReason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(assignment.priority)}`}>
                    {assignment.priority}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(assignment.status)}`}>
                    {assignment.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(assignment.createdAt)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderRulesView = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Routing Rules</h3>
          <button
            onClick={() => setShowRuleBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {routingRules.map((rule) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                    {rule.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                </div>
                <button
                  onClick={() => setEditingRule(rule)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Conditions</p>
                  <div className="space-y-1">
                    {rule.conditions.map((condition, index) => (
                      <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {condition.field} {condition.operator} {JSON.stringify(condition.value)}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Action</p>
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {rule.actions.type.replace('_', ' ')}: {JSON.stringify(rule.actions.value)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-medium text-green-600">{rule.successRate.toFixed(1)}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const renderAssignmentsView = () => {
    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search assignments..."
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
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="reassigned">Reassigned</option>
            </select>

            <select
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Methods</option>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
              <option value="rule_based">Rule Based</option>
              <option value="ai_optimized">AI Optimized</option>
            </select>

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
          </div>
        </div>

        {/* Assignments Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssignments.map((assignment) => (
                  <motion.tr
                    key={assignment.leadId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{assignment.businessName}</div>
                      <div className="text-sm text-gray-500">{assignment.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.assignedTo || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {assignment.assignmentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(assignment.status)}`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(assignment.priority)}`}>
                        {assignment.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(assignment.estimatedValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(assignment.createdAt)}
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

  const renderTeamView = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{member.name}</h4>
                    <p className="text-sm text-gray-600 capitalize">{member.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getAvailabilityColor(member.availability)}`}>
                  {member.availability}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Workload</span>
                    <span className="font-medium">
                      {member.currentWorkload} / {member.maxCapacity}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        member.currentWorkload / member.maxCapacity >= 0.9 ? 'bg-red-500' :
                        member.currentWorkload / member.maxCapacity >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(member.currentWorkload / member.maxCapacity) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Conversion:</span>
                    <p className="font-medium text-green-600">{member.performance.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Deal:</span>
                    <p className="font-medium">{formatCurrency(member.performance.avgDealSize)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Response:</span>
                    <p className="font-medium">{member.performance.responseTime}m</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Satisfaction:</span>
                    <p className="font-medium">{member.performance.satisfaction.toFixed(1)}/5</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {member.skills.slice(0, 3).map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{member.skills.length - 3}
                      </span>
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
            <h3 className="font-semibold text-red-800">Routing System Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchRoutingData}
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
          <h2 className="text-2xl font-bold text-gray-900">Intelligent Lead Routing</h2>
          <p className="text-gray-600">AI-powered lead assignment and team management system</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRuleBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage Rules
          </button>
          <button
            onClick={fetchRoutingData}
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
          onClick={() => setViewMode('rules')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'rules' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Rules
        </button>
        <button
          onClick={() => setViewMode('assignments')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'assignments' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Assignments
        </button>
        <button
          onClick={() => setViewMode('team')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            viewMode === 'team' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
          }`}
        >
          Team
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

        {viewMode === 'rules' && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderRulesView()}
          </motion.div>
        )}

        {viewMode === 'assignments' && (
          <motion.div
            key="assignments"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderAssignmentsView()}
          </motion.div>
        )}

        {viewMode === 'team' && (
          <motion.div
            key="team"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderTeamView()}
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Routing Analytics</h3>
            <p className="text-gray-600">Advanced analytics and performance metrics coming soon...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment Detail Modal */}
      <AnimatePresence>
        {selectedAssignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{selectedAssignment.businessName}</h3>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(selectedAssignment.status)}`}>
                      {selectedAssignment.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedAssignment.priority)}`}>
                      {selectedAssignment.priority}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <p className="text-sm text-gray-900">{selectedAssignment.assignedTo || 'Unassigned'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {selectedAssignment.assignmentMethod.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Reason</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedAssignment.assignmentReason}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                    <p className="text-sm text-gray-900">{selectedAssignment.score}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value</label>
                    <p className="text-sm text-gray-900">{formatCurrency(selectedAssignment.estimatedValue)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-sm text-gray-900">{selectedAssignment.location}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <p className="text-sm text-gray-900">{selectedAssignment.source}</p>
                  </div>
                </div>

                {selectedAssignment.skills.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedAssignment.skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
