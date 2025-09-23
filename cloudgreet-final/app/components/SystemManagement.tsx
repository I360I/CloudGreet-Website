"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Server, 
  Database, 
  Globe, 
  Shield, 
  Zap, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Settings,
  Monitor,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  Lock
} from 'lucide-react'

interface SystemStatus {
  name: string
  status: 'online' | 'warning' | 'offline'
  uptime: string
  responseTime: string
  lastCheck: string
}

interface SystemHealthData {
  systemHealth: string
  healthPercentage: number
  onlineServices: number
  totalServices: number
  systemServices: SystemStatus[]
  systemMetrics: {
    cpu: number
    memory: number
    disk: number
    network: number
  }
  securityStatus: {
    ssl: string
    firewall: string
    encryption: string
    monitoring: string
  }
  lastUpdated: string
  error?: string
}

export default function SystemManagement() {
  const [refreshing, setRefreshing] = useState(false)
  const [systemData, setSystemData] = useState<SystemHealthData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSystemHealth = async () => {
    try {
      setError(null)
      const response = await fetch('/api/admin/system-health')
      const data = await response.json()
      setSystemData(data)
    } catch (err) {
      setError('Failed to fetch system health data')
      // Console error removed for production
    }
  }

  useEffect(() => {
    fetchSystemHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSystemHealth()
    setRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-emerald-400'
      case 'warning': return 'text-yellow-400'
      case 'offline': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return CheckCircle
      case 'warning': return AlertTriangle
      case 'offline': return AlertTriangle
      default: return Clock
    }
  }

  const ServiceCard = ({ service }: { service: SystemStatus }) => {
    const StatusIcon = getStatusIcon(service.status)
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <StatusIcon className={`w-5 h-5 mr-2 ${getStatusColor(service.status)}`} />
            <h3 className="text-white font-medium">{service.name}</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            service.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' :
            service.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {service.status}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Uptime</p>
            <p className="text-white font-semibold">{service.uptime}</p>
          </div>
          <div>
            <p className="text-gray-400">Response</p>
            <p className="text-white font-semibold">{service.responseTime}</p>
          </div>
          <div>
            <p className="text-gray-400">Last Check</p>
            <p className="text-white font-semibold">{service.lastCheck}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  const MetricBar = ({ label, value, color, icon: Icon }: any) => (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Icon className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-gray-300 text-sm">{label}</span>
        </div>
        <span className="text-white font-semibold">{value}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, delay: 0.2 }}
          className={`h-2 rounded-full ${color}`}
        />
      </div>
    </div>
  )

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">System Management</h2>
            <p className="text-gray-400">Monitor and manage your CloudGreet infrastructure</p>
          </div>
        </div>
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
            <div>
              <h3 className="text-red-400 font-semibold">System Health Check Failed</h3>
              <p className="text-gray-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!systemData) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">System Management</h2>
            <p className="text-gray-400">Monitor and manage your CloudGreet infrastructure</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          <span className="text-gray-400 ml-3">Loading system health...</span>
        </div>
      </div>
    )
  }

  const getHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'excellent': return 'text-emerald-400'
      case 'good': return 'text-blue-400'
      case 'warning': return 'text-yellow-400'
      case 'critical': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getHealthBgColor = (health: string) => {
    switch (health.toLowerCase()) {
      case 'excellent': return 'bg-emerald-500/20'
      case 'good': return 'bg-blue-500/20'
      case 'warning': return 'bg-yellow-500/20'
      case 'critical': return 'bg-red-500/20'
      default: return 'bg-gray-500/20'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">System Management</h2>
          <p className="text-gray-400">Monitor and manage your CloudGreet infrastructure</p>
          {systemData.lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(systemData.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors border border-purple-500/30 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">System Health</p>
              <p className={`text-2xl font-bold ${getHealthColor(systemData.systemHealth)}`}>
                {systemData.systemHealth}
              </p>
              <p className="text-xs text-gray-500">{systemData.healthPercentage}%</p>
            </div>
            <div className={`p-3 rounded-lg ${getHealthBgColor(systemData.systemHealth)} border border-gray-700/50`}>
              <Shield className={`w-6 h-6 ${getHealthColor(systemData.systemHealth)}`} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Active Services</p>
              <p className="text-2xl font-bold text-blue-400">{systemData.onlineServices}</p>
              <p className="text-xs text-gray-500">of {systemData.totalServices}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/20 border border-gray-700/50">
              <Server className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Avg Response</p>
              <p className="text-2xl font-bold text-purple-400">
                {systemData.systemServices.length > 0 
                  ? `${Math.round(systemData.systemServices.reduce((acc, s) => {
                      const time = parseInt(s.responseTime.replace('ms', '')) || 0
                      return acc + time
                    }, 0) / systemData.systemServices.length)}ms`
                  : 'N/A'
                }
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/20 border border-gray-700/50">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-1">Uptime</p>
              <p className="text-2xl font-bold text-orange-400">
                {systemData.systemServices.length > 0 
                  ? `${Math.round(systemData.systemServices.reduce((acc, s) => {
                      const uptime = parseFloat(s.uptime.replace('%', '')) || 0
                      return acc + uptime
                    }, 0) / systemData.systemServices.length)}%`
                  : 'N/A'
                }
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/20 border border-gray-700/50">
              <Activity className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">System Resources</h3>
          <div className="space-y-4">
            <MetricBar
              label="CPU Usage"
              value={systemData.systemMetrics.cpu}
              color="bg-blue-500"
              icon={Cpu}
            />
            <MetricBar
              label="Memory Usage"
              value={systemData.systemMetrics.memory}
              color="bg-purple-500"
              icon={MemoryStick}
            />
            <MetricBar
              label="Disk Usage"
              value={systemData.systemMetrics.disk}
              color="bg-emerald-500"
              icon={HardDrive}
            />
            <MetricBar
              label="Network I/O"
              value={systemData.systemMetrics.network}
              color="bg-orange-500"
              icon={Wifi}
            />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Security Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Lock className="w-4 h-4 mr-2 text-emerald-400" />
                <span className="text-gray-300">SSL Certificate</span>
              </div>
              <span className={`text-sm font-semibold ${
                systemData.securityStatus.ssl === 'Valid' ? 'text-emerald-400' : 'text-yellow-400'
              }`}>
                {systemData.securityStatus.ssl}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2 text-emerald-400" />
                <span className="text-gray-300">Firewall</span>
              </div>
              <span className={`text-sm font-semibold ${
                systemData.securityStatus.firewall === 'Active' ? 'text-emerald-400' : 'text-yellow-400'
              }`}>
                {systemData.securityStatus.firewall}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="w-4 h-4 mr-2 text-emerald-400" />
                <span className="text-gray-300">Database Encryption</span>
              </div>
              <span className={`text-sm font-semibold ${
                systemData.securityStatus.encryption === 'Enabled' ? 'text-emerald-400' : 'text-yellow-400'
              }`}>
                {systemData.securityStatus.encryption}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Monitor className="w-4 h-4 mr-2 text-emerald-400" />
                <span className="text-gray-300">Intrusion Detection</span>
              </div>
              <span className={`text-sm font-semibold ${
                systemData.securityStatus.monitoring === 'Active' ? 'text-emerald-400' : 'text-yellow-400'
              }`}>
                {systemData.securityStatus.monitoring}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Service Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemData.systemServices.map((service, index) => (
            <ServiceCard key={index} service={service} />
          ))}
        </div>
      </div>

      {/* System Actions */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">System Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors border border-blue-500/30">
            <Database className="w-4 h-4 mr-2" />
            Backup Database
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors border border-purple-500/30">
            <RefreshCw className="w-4 h-4 mr-2" />
            Restart Services
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors border border-emerald-500/30">
            <Settings className="w-4 h-4 mr-2" />
            Update Config
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition-colors border border-orange-500/30">
            <Monitor className="w-4 h-4 mr-2" />
            View Logs
          </button>
        </div>
      </div>
    </div>
  )
}
