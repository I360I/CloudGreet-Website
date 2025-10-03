'use client'

import { useState, useEffect } from 'react'
import { Card } from './ui/Card'

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor: string[]
    borderColor: string[]
    borderWidth: number
  }[]
}

interface AdminStats {
  totalClients: number
  activeClients: number
  monthlyRevenue: number
  totalRevenue: number
  averageClientValue: number
  conversionRate: number
  callsToday: number
  appointmentsToday: number
  smsSent: number
  systemHealth: string
}

interface AdminChartsProps {
  stats?: AdminStats
  clients?: any[]
}

export default function AdminCharts({ stats: propStats, clients }: AdminChartsProps = {}) {
  const [stats, setStats] = useState<AdminStats | null>(propStats || null)
  const [loading, setLoading] = useState(!propStats)

  useEffect(() => {
    if (!propStats) {
      fetchAdminStats()
    } else {
      setLoading(false)
    }
  }, [propStats])

  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      } else {
        // No fallback - show empty state if API fails
        setStats(null)
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
      // No fallback - show empty state on error
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <div className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load admin statistics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">{formatNumber(stats.totalClients)}</p>
                <p className="text-xs text-green-400 mt-1">+12% from last month</p>
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
                <p className="text-2xl font-bold text-white">{formatNumber(stats.activeClients)}</p>
                <p className="text-xs text-green-400 mt-1">91% active rate</p>
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
                <p className="text-sm font-medium text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-green-400 mt-1">+18% from last month</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <span className="text-purple-400 text-xl">💰</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Monthly Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.monthlyRevenue)}</p>
                <p className="text-xs text-green-400 mt-1">+15% from last month</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <span className="text-orange-400 text-xl">📈</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls & SMS Chart */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Communication Volume</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-white">Total Calls</span>
                </div>
                <span className="text-white font-semibold">{formatNumber(stats.callsToday)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-white">Total SMS</span>
                </div>
                <span className="text-white font-semibold">{formatNumber(stats.smsSent)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-white">Conversion Rate</span>
                </div>
                <span className="text-white font-semibold">{stats.conversionRate}%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">This Month</span>
                <span className="text-white font-semibold">{formatCurrency(stats.monthlyRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Revenue</span>
                <span className="text-white font-semibold">{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Average per User</span>
                <span className="text-white font-semibold">{formatCurrency(stats.averageClientValue)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
