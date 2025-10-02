'use client'

import { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Progress } from './ui/Progress'
import { LoadingSpinner } from './ui/LoadingSpinner'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalCalls: number
  totalSMS: number
  systemUptime: number
  memoryUsage: number
  cpuUsage: number
  errorRate: number
}

interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: string
  resolved: boolean
}

export default function SystemManagement() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchSystemData()
    const interval = setInterval(fetchSystemData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchSystemData = async () => {
    try {
      setRefreshing(true)
      
      // Fetch system health
      const healthResponse = await fetch('/api/admin/system-health')
      const healthData = await healthResponse.json()
      
      // Fetch admin stats
      const statsResponse = await fetch('/api/admin/stats')
      const statsData = await statsResponse.json()
      
      if (healthData.success && statsData.success) {
        setStats({
          totalUsers: statsData.data.totalUsers || 0,
          activeUsers: statsData.data.activeUsers || 0,
          totalCalls: statsData.data.totalCalls || 0,
          totalSMS: statsData.data.totalSMS || 0,
          systemUptime: healthData.data.uptime || 0,
          memoryUsage: healthData.data.memoryUsage || 0,
          cpuUsage: healthData.data.cpuUsage || 0,
          errorRate: healthData.data.errorRate || 0
        })
        
        // Generate mock alerts based on system status
        const mockAlerts: SystemAlert[] = []
        
        if (healthData.data.memoryUsage > 80) {
          mockAlerts.push({
            id: 'memory-high',
            type: 'warning',
            message: 'High memory usage detected',
            timestamp: new Date().toISOString(),
            resolved: false
          })
        }
        
        if (healthData.data.cpuUsage > 90) {
          mockAlerts.push({
            id: 'cpu-high',
            type: 'error',
            message: 'High CPU usage detected',
            timestamp: new Date().toISOString(),
            resolved: false
          })
        }
        
        if (healthData.data.errorRate > 5) {
          mockAlerts.push({
            id: 'error-rate-high',
            type: 'error',
            message: 'High error rate detected',
            timestamp: new Date().toISOString(),
            resolved: false
          })
        }
        
        setAlerts(mockAlerts)
      }
    } catch (error) {
      console.error('Failed to fetch system data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      case 'info': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" text="Loading system data..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Management</h2>
          <p className="text-gray-400">Monitor system performance and health</p>
        </div>
        <Button
          onClick={fetchSystemData}
          disabled={refreshing}
          variant="secondary"
        >
          {refreshing ? <LoadingSpinner size="sm" /> : 'Refresh'}
        </Button>
      </div>

      {/* System Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400 text-xl">👥</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-400 text-xl">🟢</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Calls</p>
                  <p className="text-2xl font-bold text-white">{stats.totalCalls}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-400 text-xl">📞</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total SMS</p>
                  <p className="text-2xl font-bold text-white">{stats.totalSMS}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-orange-400 text-xl">💬</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* System Performance */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Memory Usage</span>
                    <span className="text-white">{stats.memoryUsage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={stats.memoryUsage} 
                    className="h-2"
                    color={stats.memoryUsage > 80 ? 'red' : stats.memoryUsage > 60 ? 'yellow' : 'green'}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">CPU Usage</span>
                    <span className="text-white">{stats.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={stats.cpuUsage} 
                    className="h-2"
                    color={stats.cpuUsage > 90 ? 'red' : stats.cpuUsage > 70 ? 'yellow' : 'green'}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Error Rate</span>
                    <span className="text-white">{stats.errorRate.toFixed(2)}%</span>
                  </div>
                  <Progress 
                    value={stats.errorRate} 
                    className="h-2"
                    color={stats.errorRate > 5 ? 'red' : stats.errorRate > 2 ? 'yellow' : 'green'}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Uptime</span>
                  <span className="text-white font-mono">{formatUptime(stats.systemUptime)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  <Badge color="green">Healthy</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Updated</span>
                  <span className="text-white text-sm">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* System Alerts */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Alerts</h3>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 text-2xl">✓</span>
              </div>
              <p className="text-gray-400">No active alerts</p>
              <p className="text-sm text-gray-500">All systems are running normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${getAlertColor(alert.type)}`} />
                  <div className="flex-1">
                    <p className="text-white font-medium">{alert.message}</p>
                    <p className="text-sm text-gray-400">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                  <Badge color={alert.type === 'error' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue'}>
                    {alert.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
