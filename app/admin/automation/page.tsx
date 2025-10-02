'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, Play, Pause, Settings, BarChart3, 
  Users, Mail, Phone, Calendar, Clock,
  CheckCircle, AlertCircle, TrendingUp, Target,
  Activity, RefreshCw, Eye, Edit, Trash2
} from 'lucide-react'

interface AutomationRule {
  id: string
  name: string
  type: 'lead_scoring' | 'follow_up' | 'email_sequence' | 'call_scheduling' | 'crm_update'
  status: 'active' | 'paused' | 'draft'
  trigger: string
  action: string
  executions: number
  success_rate: number
  last_run: string
  created_at: string
}

interface AutomationStats {
  total_rules: number
  active_rules: number
  executions_today: number
  success_rate: number
  leads_processed: number
  emails_sent: number
  calls_scheduled: number
}

export default function AutomationDashboard() {
  const [automations, setAutomations] = useState<AutomationRule[]>([])
  const [stats, setStats] = useState<AutomationStats>({
    total_rules: 0,
    active_rules: 0,
    executions_today: 0,
    success_rate: 0,
    leads_processed: 0,
    emails_sent: 0,
    calls_scheduled: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationRule | null>(null)

  useEffect(() => {
    loadAutomations()
    loadStats()
  }, [])

  const loadAutomations = async () => {
    try {
      // Mock data - replace with real API call
      const mockAutomations: AutomationRule[] = [
        {
          id: '1',
          name: 'Lead Scoring & Prioritization',
          type: 'lead_scoring',
          status: 'active',
          trigger: 'New lead added to CRM',
          action: 'Calculate AI score and set priority level',
          executions: 1247,
          success_rate: 98.5,
          last_run: '2 minutes ago',
          created_at: '2025-01-15'
        },
        {
          id: '2',
          name: 'High-Value Lead Follow-up',
          type: 'follow_up',
          status: 'active',
          trigger: 'Lead score >= 80',
          action: 'Schedule immediate follow-up sequence',
          executions: 234,
          success_rate: 89.2,
          last_run: '5 minutes ago',
          created_at: '2025-01-15'
        },
        {
          id: '3',
          name: 'Email Sequence Starter',
          type: 'email_sequence',
          status: 'active',
          trigger: 'Lead contacted via phone',
          action: 'Send follow-up email within 4 hours',
          executions: 567,
          success_rate: 94.7,
          last_run: '1 hour ago',
          created_at: '2025-01-14'
        },
        {
          id: '4',
          name: 'Demo Scheduling Automation',
          type: 'call_scheduling',
          status: 'active',
          trigger: 'Lead expresses interest',
          action: 'Schedule demo call and send calendar invite',
          executions: 89,
          success_rate: 91.0,
          last_run: '3 hours ago',
          created_at: '2025-01-14'
        },
        {
          id: '5',
          name: 'CRM Data Enrichment',
          type: 'crm_update',
          status: 'paused',
          trigger: 'Lead information incomplete',
          action: 'Auto-research and fill missing data',
          executions: 445,
          success_rate: 76.8,
          last_run: '1 day ago',
          created_at: '2025-01-13'
        },
        {
          id: '6',
          name: 'Nurture Campaign',
          type: 'email_sequence',
          status: 'draft',
          trigger: 'No response after 7 days',
          action: 'Send re-engagement email sequence',
          executions: 0,
          success_rate: 0,
          last_run: 'Never',
          created_at: '2025-01-12'
        }
      ]

      setAutomations(mockAutomations)
    } catch (error) {
      console.error('Failed to load automations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Mock stats - replace with real API call
      const mockStats: AutomationStats = {
        total_rules: 6,
        active_rules: 4,
        executions_today: 47,
        success_rate: 92.3,
        leads_processed: 1247,
        emails_sent: 567,
        calls_scheduled: 89
      }

      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const toggleAutomation = async (automationId: string) => {
    try {
      const automation = automations.find(a => a.id === automationId)
      if (!automation) return

      const newStatus = automation.status === 'active' ? 'paused' : 'active'
      
      // Update local state
      setAutomations(prev => prev.map(a => 
        a.id === automationId ? { ...a, status: newStatus } : a
      ))

      // Here you would make an API call to update the automation status
      console.log(`Automation ${automationId} status changed to ${newStatus}`)
    } catch (error) {
      console.error('Failed to toggle automation:', error)
    }
  }

  const executeAutomation = async (automationId: string) => {
    try {
      // Here you would trigger the automation manually
      console.log(`Executing automation ${automationId}`)
      
      // Update last run time
      setAutomations(prev => prev.map(a => 
        a.id === automationId ? { ...a, last_run: 'Just now' } : a
      ))
    } catch (error) {
      console.error('Failed to execute automation:', error)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lead_scoring': return <Target className="w-5 h-5" />
      case 'follow_up': return <Users className="w-5 h-5" />
      case 'email_sequence': return <Mail className="w-5 h-5" />
      case 'call_scheduling': return <Phone className="w-5 h-5" />
      case 'crm_update': return <BarChart3 className="w-5 h-5" />
      default: return <Zap className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lead_scoring': return 'bg-purple-100 text-purple-800'
      case 'follow_up': return 'bg-blue-100 text-blue-800'
      case 'email_sequence': return 'bg-green-100 text-green-800'
      case 'call_scheduling': return 'bg-orange-100 text-orange-800'
      case 'crm_update': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Automation Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your automated sales processes</p>
          </div>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Create New Rule
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rules</p>
                <p className="text-3xl font-bold text-green-600">{stats.active_rules}</p>
                <p className="text-sm text-gray-500">of {stats.total_rules} total</p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Executions Today</p>
                <p className="text-3xl font-bold text-blue-600">{stats.executions_today}</p>
                <p className="text-sm text-gray-500">automated actions</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-purple-600">{stats.success_rate}%</p>
                <p className="text-sm text-gray-500">automation accuracy</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Leads Processed</p>
                <p className="text-3xl font-bold text-orange-600">{stats.leads_processed}</p>
                <p className="text-sm text-gray-500">total processed</p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </motion.div>
        </div>

        {/* Automation Rules */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Automation Rules</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {automations.map((automation, index) => (
              <motion.div
                key={automation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${getTypeColor(automation.type)}`}>
                      {getTypeIcon(automation.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{automation.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(automation.status)}`}>
                          {automation.status}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(automation.type)}`}>
                          {automation.type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p><strong>Trigger:</strong> {automation.trigger}</p>
                          <p><strong>Action:</strong> {automation.action}</p>
                        </div>
                        <div>
                          <p><strong>Executions:</strong> {automation.executions.toLocaleString()}</p>
                          <p><strong>Success Rate:</strong> {automation.success_rate}%</p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-2">
                        Last run: {automation.last_run}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => executeAutomation(automation.id)}
                      className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                      title="Execute now"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => toggleAutomation(automation.id)}
                      className={`p-2 transition-colors ${
                        automation.status === 'active' 
                          ? 'text-yellow-600 hover:text-yellow-800' 
                          : 'text-green-600 hover:text-green-800'
                      }`}
                      title={automation.status === 'active' ? 'Pause' : 'Activate'}
                    >
                      {automation.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => setSelectedAutomation(automation)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Automation Activity</h2>
          
          <div className="space-y-4">
            {[
              { time: '2 minutes ago', action: 'Lead Scoring executed for ABC HVAC', status: 'success', icon: <Target className="w-4 h-4" /> },
              { time: '5 minutes ago', action: 'Follow-up sequence started for Premier Painting', status: 'success', icon: <Users className="w-4 h-4" /> },
              { time: '1 hour ago', action: 'Email sequence sent to 12 leads', status: 'success', icon: <Mail className="w-4 h-4" /> },
              { time: '3 hours ago', action: 'Demo scheduled for Reliable HVAC', status: 'success', icon: <Calendar className="w-4 h-4" /> },
              { time: '6 hours ago', action: 'CRM data enrichment completed', status: 'warning', icon: <BarChart3 className="w-4 h-4" /> }
            ].map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className={`p-2 rounded-lg ${
                  activity.status === 'success' ? 'bg-green-100 text-green-600' :
                  activity.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Automation Detail Modal */}
        {selectedAutomation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedAutomation.name}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium gap-2 ${getTypeColor(selectedAutomation.type)}`}>
                        {getTypeIcon(selectedAutomation.type)}
                        {selectedAutomation.type.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAutomation.status)}`}>
                        {selectedAutomation.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAutomation(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Trigger Condition</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedAutomation.trigger}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Automated Action</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedAutomation.action}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Execution Stats</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Executions:</span>
                          <span className="font-medium">{selectedAutomation.executions.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Success Rate:</span>
                          <span className="font-medium text-green-600">{selectedAutomation.success_rate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Run:</span>
                          <span className="font-medium">{selectedAutomation.last_run}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Performance</h3>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${selectedAutomation.success_rate}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">Success rate over time</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => executeAutomation(selectedAutomation.id)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Execute Now
                  </button>
                  <button
                    onClick={() => toggleAutomation(selectedAutomation.id)}
                    className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      selectedAutomation.status === 'active'
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {selectedAutomation.status === 'active' ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Activate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
