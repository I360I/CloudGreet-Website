'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface RevenueData {
  month: string
  revenue: number
  clients: number
  avgValue: number
}

export default function RevenueAnalytics() {
  const [timeRange, setTimeRange] = useState('6m')
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRevenueData()
  }, [timeRange])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/dashboard/revenue?timeframe=${timeRange}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch revenue data')
      }

      const data = await response.json()
      
      if (data.success && data.revenueData) {
        setRevenueData(data.revenueData)
      } else {
        // If no real data available, show empty state
        setRevenueData([])
      }
    } catch (err) {
      // Log error to monitoring system (would be sent to error tracking service in production)
      // For now, just set the error state
      setError('Failed to load revenue data')
      setRevenueData([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate real metrics from actual data
  const currentRevenue = revenueData.length > 0 ? revenueData[revenueData.length - 1].revenue : 0
  const currentClients = revenueData.length > 0 ? revenueData[revenueData.length - 1].clients : 0
  
  const previousMonthRevenue = revenueData.length > 1 ? revenueData[revenueData.length - 2].revenue : 0
  const previousMonthClients = revenueData.length > 1 ? revenueData[revenueData.length - 2].clients : 0
  
  const revenueGrowth = previousMonthRevenue > 0 
    ? ((currentRevenue - previousMonthRevenue) / previousMonthRevenue * 100)
    : 0
    
  const clientGrowth = previousMonthClients > 0 
    ? ((currentClients - previousMonthClients) / previousMonthClients * 100)
    : 0

  const totalRevenue = revenueData.reduce((sum, month) => sum + month.revenue, 0)
  const totalClients = revenueData.length > 0 ? Math.max(...revenueData.map(m => m.clients)) : 0
  const averageClientValue = currentClients > 0 ? (currentRevenue / currentClients) : 0

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-white mb-2">Unable to Load Revenue Data</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchRevenueData}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (revenueData.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="text-center">
          <div className="text-gray-400 mb-2">📊</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Revenue Data Yet</h3>
          <p className="text-gray-400 mb-4">
            Revenue analytics will appear here once you have clients and bookings.
          </p>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">$0</div>
              <div className="text-sm text-gray-400">Current Revenue</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-sm text-gray-400">Active Clients</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">0%</div>
              <div className="text-sm text-gray-400">Growth Rate</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">$0</div>
              <div className="text-sm text-gray-400">Avg Client Value</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Revenue Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
        >
          <option value="3m">Last 3 Months</option>
          <option value="6m">Last 6 Months</option>
          <option value="12m">Last 12 Months</option>
        </select>
      </div>

      {/* Revenue Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
              formatter={(value, name) => [
                name === 'revenue' ? `$${value.toLocaleString()}` : value,
                name === 'revenue' ? 'Revenue' : 'Clients'
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Client Growth Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Client Growth</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
              formatter={(value) => [value, 'Clients']}
            />
            <Bar dataKey="clients" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">
            ${currentRevenue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Current Revenue</div>
          <div className={`text-xs mt-1 ${revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {revenueGrowth >= 0 ? '↗' : '↘'} {Math.abs(revenueGrowth).toFixed(1)}% vs last month
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{currentClients}</div>
          <div className="text-sm text-gray-400">Active Clients</div>
          <div className={`text-xs mt-1 ${clientGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {clientGrowth >= 0 ? '↗' : '↘'} {Math.abs(clientGrowth).toFixed(1)}% vs last month
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Total Revenue</div>
          <div className="text-xs mt-1 text-gray-500">
            {timeRange === '3m' ? '3 months' : timeRange === '6m' ? '6 months' : '12 months'}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">
            ${averageClientValue.toFixed(0)}
          </div>
          <div className="text-sm text-gray-400">Avg Client Value</div>
          <div className="text-xs mt-1 text-gray-500">
            Per month
          </div>
        </div>
      </div>
    </div>
  )
}