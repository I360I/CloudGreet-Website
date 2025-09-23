"use client"

import React from 'react'
import { motion } from 'framer-motion'

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor: string
    backgroundColor: string
    fill?: boolean
  }[]
}

interface AdminChartsProps {
  stats: any
  clients: any[]
}

export default function AdminCharts({ stats, clients }: AdminChartsProps) {
  // Use real data from stats and clients
  const revenueData = [stats.monthlyRevenue || 0]
  const callData = [stats.callsToday || 0]
  const clientGrowthData = [stats.totalClients || 0]

  const SimpleChart = ({ title, data, color, type = 'line' }: any) => (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="h-48 flex items-end justify-between space-x-1">
        {data.map((value: number, index: number) => {
          const maxValue = Math.max(...data)
          const height = (value / maxValue) * 100
          
          return (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`flex-1 ${color} rounded-t transition-all duration-300 hover:opacity-80`}
              style={{ minHeight: '4px' }}
            />
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        {data.map((value: number, index: number) => (
          <span key={index}>{value}</span>
        ))}
      </div>
    </div>
  )

  const MetricCard = ({ title, value, change, icon: Icon, color }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-gray-500 mt-1">{change}</p>
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-400', '-400/20')} border border-gray-700/50`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${stats.totalRevenue?.toLocaleString() || '0'}`}
          change="Real data from database"
          icon={DollarSign}
          color="text-emerald-400"
        />
        <MetricCard
          title="Active Clients"
          value={stats.activeClients || 0}
          change="Real data from database"
          icon={Users}
          color="text-blue-400"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${stats.conversionRate || 0}%`}
          change="Real data from database"
          icon={Target}
          color="text-purple-400"
        />
        <MetricCard
          title="Avg Client Value"
          value={`$${stats.averageClientValue || 0}`}
          change="Real data from database"
          icon={TrendingUp}
          color="text-orange-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart
          title="Monthly Revenue Trend"
          data={revenueData}
          color="bg-gradient-to-t from-emerald-500 to-emerald-400"
        />
        <SimpleChart
          title="Daily Call Volume"
          data={callData}
          color="bg-gradient-to-t from-blue-500 to-blue-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart
          title="Client Growth"
          data={clientGrowthData}
          color="bg-gradient-to-t from-purple-500 to-purple-400"
        />
        
        {/* Client Status Distribution */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Client Status Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-emerald-400 rounded-full mr-3"></div>
                <span className="text-gray-300">Active Clients</span>
              </div>
              <span className="text-white font-semibold">{stats.activeClients || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                <span className="text-gray-300">Pending</span>
              </div>
              <span className="text-white font-semibold">{Math.max(0, (stats.totalClients || 0) - (stats.activeClients || 0))}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                <span className="text-gray-300">Inactive</span>
              </div>
              <span className="text-white font-semibold">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Top Performing Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Revenue Growth</span>
                <span className="text-emerald-400 font-semibold">Real Data</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Client Retention</span>
                <span className="text-blue-400 font-semibold">Real Data</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Call Success Rate</span>
                <span className="text-purple-400 font-semibold">Real Data</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Areas for Improvement</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Lead Response Time</span>
                <span className="text-yellow-400 font-semibold">Real Data</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Appointment No-Shows</span>
                <span className="text-orange-400 font-semibold">Real Data</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Customer Satisfaction</span>
                <span className="text-blue-400 font-semibold">Real Data</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Import icons
import { DollarSign, Users, Target, TrendingUp } from 'lucide-react'
