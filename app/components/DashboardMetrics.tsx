'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, Calendar, DollarSign, TrendingUp, TrendingDown, 
  Users, Clock, Zap, Target, Award, Activity, BarChart3 
} from 'lucide-react'

interface MetricsData {
  totalCalls: number
  totalAppointments: number
  totalRevenue: number
  conversionRate: number
  avgCallDuration: number
  customerSatisfaction: number
  monthlyGrowth: number
  revenueProjection: number
}

interface DashboardMetricsProps {
  data: MetricsData
}

export default function DashboardMetrics({ data }: DashboardMetricsProps) {
  const [animatedValues, setAnimatedValues] = useState({
    calls: 0,
    appointments: 0,
    revenue: 0,
    conversion: 0,
    duration: 0,
    satisfaction: 0,
    growth: 0,
    projection: 0
  })

  // Animate numbers on load
  useEffect(() => {
    const animateValue = (key: keyof typeof animatedValues, target: number, duration: number = 2000) => {
      const startTime = Date.now()
      const startValue = animatedValues[key]
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const currentValue = startValue + (target - startValue) * easeOut
        
        setAnimatedValues(prev => ({ ...prev, [key]: currentValue }))
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      requestAnimationFrame(animate)
    }

    // Animate all values
    animateValue('calls', data.totalCalls)
    animateValue('appointments', data.totalAppointments)
    animateValue('revenue', data.totalRevenue)
    animateValue('conversion', data.conversionRate)
    animateValue('duration', data.avgCallDuration)
    animateValue('satisfaction', data.customerSatisfaction)
    animateValue('growth', data.monthlyGrowth)
    animateValue('projection', data.revenueProjection)
  }, [data])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.round(amount))
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60)
    return `${minutes}m`
  }

  const getTrendIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUp className="w-4 h-4 text-green-400" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-400" />
    )
  }

  const getTrendColor = (value: number) => {
    return value >= 0 ? 'text-green-400' : 'text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Calls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6 hover:border-blue-500/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <Phone className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                {getTrendIcon(data.monthlyGrowth)}
                <span className={`text-sm font-medium ${getTrendColor(data.monthlyGrowth)}`}>
                  {data.monthlyGrowth >= 0 ? '+' : ''}{data.monthlyGrowth}%
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-white">
              {Math.round(animatedValues.calls)}
            </h3>
            <p className="text-gray-400">Total Calls</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((animatedValues.calls / 100) * 100, 100)}%` }}
                transition={{ delay: 0.5, duration: 1 }}
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6 hover:border-green-500/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">
                  {Math.round(animatedValues.conversion)}%
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-white">
              {Math.round(animatedValues.appointments)}
            </h3>
            <p className="text-gray-400">Appointments</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((animatedValues.appointments / 50) * 100, 100)}%` }}
                transition={{ delay: 0.7, duration: 1 }}
                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-6 hover:border-purple-500/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                {getTrendIcon(data.monthlyGrowth)}
                <span className={`text-sm font-medium ${getTrendColor(data.monthlyGrowth)}`}>
                  {data.monthlyGrowth >= 0 ? '+' : ''}{data.monthlyGrowth}%
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-white">
              {formatCurrency(animatedValues.revenue)}
            </h3>
            <p className="text-gray-400">Total Revenue</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((animatedValues.revenue / 10000) * 100, 100)}%` }}
                transition={{ delay: 0.9, duration: 1 }}
                className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Conversion Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center"
        >
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <h4 className="text-xl font-bold text-white">{Math.round(animatedValues.conversion)}%</h4>
          <p className="text-sm text-gray-400">Conversion</p>
        </motion.div>

        {/* Avg Call Duration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center"
        >
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Clock className="w-5 h-5 text-green-400" />
          </div>
          <h4 className="text-xl font-bold text-white">{formatDuration(animatedValues.duration)}</h4>
          <p className="text-sm text-gray-400">Avg Duration</p>
        </motion.div>

        {/* Customer Satisfaction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center"
        >
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Award className="w-5 h-5 text-yellow-400" />
          </div>
          <h4 className="text-xl font-bold text-white">{Math.round(animatedValues.satisfaction)}%</h4>
          <p className="text-sm text-gray-400">Satisfaction</p>
        </motion.div>

        {/* Monthly Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center"
        >
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <h4 className="text-xl font-bold text-white">{Math.round(animatedValues.growth)}%</h4>
          <p className="text-sm text-gray-400">Growth</p>
        </motion.div>
      </div>

      {/* Revenue Projection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Revenue Projection</h3>
              <p className="text-sm text-gray-400">Next 30 days based on current trends</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                +{Math.round(data.monthlyGrowth)}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Current</span>
              <span className="text-sm font-medium text-white">{formatCurrency(data.totalRevenue)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full w-1/3" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Projected</span>
              <span className="text-sm font-medium text-emerald-400">
                {formatCurrency(animatedValues.projection)}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((animatedValues.projection / data.totalRevenue) * 100, 100)}%` }}
                transition={{ delay: 1, duration: 1.5 }}
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
