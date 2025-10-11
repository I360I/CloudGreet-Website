"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, Database, Phone, CreditCard, AlertTriangle, 
  CheckCircle, Clock, RefreshCw, TrendingUp, Users,
  Server, Shield, Zap
} from 'lucide-react'

interface HealthData {
  status: string
  timestamp: string
  uptime: number
  environment?: string
  version?: string
  services: {
    database: { status: string; latency_ms: number; error?: string }
    telynyx: { status: string; latency_ms: number; configured: boolean }
    stripe: { status: string; latency_ms: number; configured: boolean }
  }
}

export default function MonitoringPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/monitoring/health')
      const data = await response.json()
      setHealthData(data)
      setLastRefresh(new Date())
    } catch (error) {

    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    const interval = setInterval(fetchHealthData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'unhealthy':
        return <AlertTriangle className="w-5 h-5 text-red-400" />
      case 'not_configured':
        return <Clock className="w-5 h-5 text-yellow-400" />
      default:
        return <Activity className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 border-green-500/30 text-green-400'
      case 'unhealthy':
        return 'bg-red-500/10 border-red-500/30 text-red-400'
      case 'not_configured':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400'
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading monitoring data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">System Monitoring</h1>
              <p className="text-gray-400 mt-1">Real-time health status and performance metrics</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchHealthData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Overall Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className={`rounded-2xl p-6 border ${getStatusColor(healthData?.status || 'unknown')}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(healthData?.status || 'unknown')}
                <div>
                  <h2 className="text-2xl font-bold">
                    System Status: {healthData?.status?.toUpperCase() || 'UNKNOWN'}
                  </h2>
                  <p className="text-gray-300">
                    Uptime: {healthData ? formatUptime(healthData.uptime) : 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Last Check</div>
                <div className="font-mono text-sm">
                  {healthData ? new Date(healthData.timestamp).toLocaleTimeString() : 'Unknown'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Service Status Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Database */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-xl p-6 border ${getStatusColor(healthData?.services.database.status || 'unknown')}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Database</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Status</span>
                <span className="font-semibold">{healthData?.services.database.status || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Latency</span>
                <span className="font-mono text-sm">{healthData?.services.database.latency_ms || 0}ms</span>
              </div>
              {healthData?.services.database.error && (
                <div className="text-xs text-red-400 mt-2">
                  Error: {healthData.services.database.error}
                </div>
              )}
            </div>
          </motion.div>

          {/* Telnyx */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-xl p-6 border ${getStatusColor(healthData?.services.telynyx.status || 'unknown')}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <Phone className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Telnyx</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Status</span>
                <span className="font-semibold">{healthData?.services.telynyx.status || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Latency</span>
                <span className="font-mono text-sm">{healthData?.services.telynyx.latency_ms || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Configured</span>
                <span className="font-semibold">
                  {healthData?.services.telynyx.configured ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Stripe */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`rounded-xl p-6 border ${getStatusColor(healthData?.services.stripe.status || 'unknown')}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Stripe</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Status</span>
                <span className="font-semibold">{healthData?.services.stripe.status || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Latency</span>
                <span className="font-mono text-sm">{healthData?.services.stripe.latency_ms || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Configured</span>
                <span className="font-semibold">
                  {healthData?.services.stripe.configured ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* System Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-4 gap-6"
        >
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Server className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400">Environment</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {healthData?.environment || 'Unknown'}
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-gray-400">Security</span>
            </div>
            <div className="text-2xl font-bold text-green-400">Secure</div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400">Response Time</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {healthData ? Math.max(...Object.values(healthData.services).map(s => s.latency_ms)) : 0}ms
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400">Version</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {healthData?.version || '1.0.0'}
            </div>
          </div>
        </motion.div>

        {/* Alerts */}
        {healthData?.status === 'unhealthy' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-red-500/10 border border-red-500/30 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-red-400">System Alerts</h3>
            </div>
            <div className="space-y-2 text-gray-300">
              {Object.entries(healthData.services).map(([service, data]) => {
                if (data.status === 'unhealthy') {
                  return (
                    <div key={service} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="capitalize">{service} service is experiencing issues</span>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
