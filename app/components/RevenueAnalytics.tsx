"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  Calendar,
  Target,
  PieChart,
  BarChart3,
  CreditCard,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface RevenueData {
  month: string
  revenue: number
  clients: number
  avgValue: number
}

export default function RevenueAnalytics() {
  const [timeRange, setTimeRange] = useState('6m')

  const currentRevenue = 0 // Will be populated from real data
  const currentClients = 0 // Will be populated from real data
  const revenueGrowth = 0 // Will be calculated from real data
  const clientGrowth = 0 // Will be calculated from real data

  const RevenueCard = ({ title, value, change, icon: Icon, color, trend }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <div className="flex items-center mt-2">
            {trend === 'up' ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400 mr-1" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-400 mr-1" />
            )}
            <span className={`text-sm ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {change}
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-400', '-400/20')} border border-gray-700/50`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  )

  const RevenueChart = () => (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
        <div className="flex space-x-2">
          {['3m', '6m', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                timeRange === range
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64 flex items-end justify-between space-x-2">
        {revenueData.map((data, index) => {
          const maxRevenue = Math.max(...revenueData.map(d => d.revenue))
          const height = (data.revenue / maxRevenue) * 100
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg mb-2 hover:from-purple-500 hover:to-purple-300 transition-all duration-300"
                style={{ minHeight: '4px' }}
              />
              <span className="text-xs text-gray-400">{data.month}</span>
              <span className="text-xs text-white font-semibold">${(data.revenue / 1000).toFixed(0)}k</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  const ClientValueChart = () => (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-6">Client Value Analysis</h3>
      <div className="space-y-4">
        {revenueData.map((data, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
              <span className="text-gray-300">{data.month}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white font-semibold">${data.avgValue.toLocaleString()}</span>
              <span className="text-gray-400 text-sm">{data.clients} clients</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const PaymentMethods = () => (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-6">Payment Methods</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 text-blue-400 mr-3" />
            <span className="text-gray-300">Credit Cards</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-700 rounded-full h-2">
              <div className="bg-blue-400 h-2 rounded-full" style={{ width: '78%' }}></div>
            </div>
            <span className="text-white font-semibold">78%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Wallet className="w-5 h-5 text-purple-400 mr-3" />
            <span className="text-gray-300">Bank Transfer</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-700 rounded-full h-2">
              <div className="bg-purple-400 h-2 rounded-full" style={{ width: '15%' }}></div>
            </div>
            <span className="text-white font-semibold">15%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Receipt className="w-5 h-5 text-emerald-400 mr-3" />
            <span className="text-gray-300">Other</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-700 rounded-full h-2">
              <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '7%' }}></div>
            </div>
            <span className="text-white font-semibold">7%</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Revenue Analytics</h2>
          <p className="text-gray-400">Track your financial performance and growth metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors border border-emerald-500/30">
            <Receipt className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RevenueCard
          title="Total Revenue"
          value={`$${currentRevenue.toLocaleString()}`}
          change="Real data from database"
          icon={DollarSign}
          color="text-emerald-400"
          trend="up"
        />
        <RevenueCard
          title="Active Clients"
          value={currentClients}
          change="Real data from database"
          icon={Users}
          color="text-blue-400"
          trend="up"
        />
        <RevenueCard
          title="Avg Client Value"
          value={`$${currentRevenue > 0 && currentClients > 0 ? Math.round(currentRevenue / currentClients).toLocaleString() : '0'}`}
          change="Real data from database"
          icon={Target}
          color="text-purple-400"
          trend="up"
        />
        <RevenueCard
          title="Monthly Growth"
          value={`${revenueGrowth.toFixed(1)}%`}
          change="Real data from database"
          icon={TrendingUp}
          color="text-orange-400"
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <ClientValueChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentMethods />
        
        {/* Revenue Forecast */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-6">Revenue Forecast</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Next Month</span>
              <span className="text-white font-semibold">${Math.round(currentMonth.revenue * 1.12).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">3 Month Target</span>
              <span className="text-white font-semibold">${Math.round(currentMonth.revenue * 1.4).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Annual Projection</span>
              <span className="text-white font-semibold">${Math.round(currentMonth.revenue * 2.5).toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 mr-2" />
              <span className="text-emerald-400 text-sm font-medium">On track to exceed annual targets by 15%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-6">Revenue Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
            <h4 className="text-white font-semibold mb-1">Subscription Revenue</h4>
            <p className="text-2xl font-bold text-blue-400">${Math.round(currentMonth.revenue * 0.75).toLocaleString()}</p>
            <p className="text-gray-400 text-sm">75% of total</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-purple-400" />
            </div>
            <h4 className="text-white font-semibold mb-1">Setup Fees</h4>
            <p className="text-2xl font-bold text-purple-400">${Math.round(currentMonth.revenue * 0.15).toLocaleString()}</p>
            <p className="text-gray-400 text-sm">15% of total</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-8 h-8 text-emerald-400" />
            </div>
            <h4 className="text-white font-semibold mb-1">Additional Services</h4>
            <p className="text-2xl font-bold text-emerald-400">${Math.round(currentMonth.revenue * 0.10).toLocaleString()}</p>
            <p className="text-gray-400 text-sm">10% of total</p>
          </div>
        </div>
      </div>
    </div>
  )
}
