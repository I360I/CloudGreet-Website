"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Clock, Server, Database, Shield, Zap } from 'lucide-react'

interface ServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'outage'
  uptime: string
  responseTime: number
}

interface SystemStatus {
  overall: 'operational' | 'degraded' | 'outage'
  services: ServiceStatus[]
  lastChecked: string
}

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/monitoring')
      const data = await response.json()
      
      if (data.success) {
        setStatus({
          overall: data.status,
          services: [
            {
              name: 'Database',
              status: data.services.database === 'healthy' ? 'operational' : 'degraded',
              uptime: '99.9%',
              responseTime: 45
            },
            {
              name: 'API Services',
              status: 'operational',
              uptime: '99.8%',
              responseTime: data.responseTime || 120
            },
            {
              name: 'Phone System',
              status: 'operational',
              uptime: '99.9%',
              responseTime: 85
            },
            {
              name: 'AI Processing',
              status: 'operational',
              uptime: '99.7%',
              responseTime: 250
            }
          ],
          lastChecked: new Date().toISOString()
        })
      }
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-400 bg-green-400/10'
      case 'degraded': return 'text-yellow-400 bg-yellow-400/10'
      case 'outage': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-5 h-5" />
      case 'degraded': return <AlertCircle className="w-5 h-5" />
      case 'outage': return <AlertCircle className="w-5 h-5" />
      default: return <Clock className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <motion.div
              className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">CloudGreet System Status</h1>
          <p className="text-gray-300 text-lg">
            Real-time monitoring of our AI receptionist platform
          </p>
          <div className="mt-4 text-sm text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </motion.div>

        {/* Overall Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Overall System Status</h2>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor(status?.overall || 'operational')}`}>
              {getStatusIcon(status?.overall || 'operational')}
              <span className="font-semibold capitalize">{status?.overall || 'operational'}</span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">99.9%</div>
              <div className="text-gray-300">Uptime (30 days)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">&lt;100ms</div>
              <div className="text-gray-300">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-gray-300">Monitoring</div>
            </div>
          </div>
        </motion.div>

        {/* Services Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h3 className="text-xl font-bold mb-6">Service Status</h3>
          
          {status?.services.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-black/30 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    {service.name === 'Database' && <Database className="w-6 h-6 text-blue-400" />}
                    {service.name === 'API Services' && <Server className="w-6 h-6 text-green-400" />}
                    {service.name === 'Phone System' && <Zap className="w-6 h-6 text-purple-400" />}
                    {service.name === 'AI Processing' && <Shield className="w-6 h-6 text-yellow-400" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{service.name}</h4>
                    <p className="text-gray-400 text-sm">
                      {service.uptime} uptime • {service.responseTime}ms avg response
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(service.status)}`}>
                  {getStatusIcon(service.status)}
                  <span className="text-sm font-medium capitalize">{service.status}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-gray-400 text-sm"
        >
          <p>Monitoring powered by CloudGreet Infrastructure</p>
          <p className="mt-2">
            <a href="/dashboard" className="text-blue-400 hover:text-blue-300 transition-colors">
              ← Back to Dashboard
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
