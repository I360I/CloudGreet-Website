"use client"

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring'
import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, Phone, Calendar, AlertCircle, CheckCircle } from 'lucide-react'

interface ROIData {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  appointmentsBooked: number
  appointmentsCompleted: number
  totalRevenue: number
  averageTicket: number
  closeRate: number
  monthlyCost: number
  perBookingFee: number
  totalFees: number
  netROI: number
  roiPercentage: number
}

interface ROICalculatorProps {
  businessId: string
  className?: string
}

export default function ROICalculator({ businessId, className = '' }: ROICalculatorProps) {
  const [roiData, setRoiData] = useState<ROIData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRealROIData()
  }, [businessId])

  const loadRealROIData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/dashboard/roi-metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRoiData(data.roi)
      } else {
        // Show empty state instead of mock data
        setRoiData(null)
      }
    } catch (error) {
      logger.error('Failed to load ROI data:', { businessId, error: error instanceof Error ? error.message : 'Unknown' })
      setRoiData(null)
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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700/50 rounded"></div>
            <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!roiData) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-4">ROI Calculator</h3>
        <p className="text-gray-400">No data available</p>
      </div>
    )
  }

  return (
    <div className={`bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">ROI Calculator</h3>
          <p className="text-gray-400 text-sm">Return on Investment Analysis</p>
        </div>
      </div>

      {/* ROI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">Net ROI</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(roiData.netROI)}
          </div>
          <div className="text-sm text-green-400">
            {formatPercentage(roiData.roiPercentage)} return
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-5 h-5 text-blue-400" />
            <span className="text-blue-400 font-medium">Revenue</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(roiData.totalRevenue)}
          </div>
          <div className="text-sm text-blue-400">
            {roiData.appointmentsCompleted} completed jobs
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-medium">Calls</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {roiData.totalCalls}
          </div>
          <div className="text-sm text-purple-400">
            {roiData.answeredCalls} answered
          </div>
        </motion.div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Call Performance */}
        <div className="space-y-4">
          <h4 className="text-white font-medium flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Call Performance
          </h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Calls</span>
              <span className="text-white font-medium">{roiData.totalCalls}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Answered</span>
              <span className="text-green-400 font-medium">{roiData.answeredCalls}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Missed</span>
              <span className="text-red-400 font-medium">{roiData.missedCalls}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Answer Rate</span>
              <span className="text-white font-medium">
                {roiData.totalCalls > 0 ? formatPercentage((roiData.answeredCalls / roiData.totalCalls) * 100) : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="space-y-4">
          <h4 className="text-white font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Revenue Metrics
          </h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Appointments Booked</span>
              <span className="text-white font-medium">{roiData.appointmentsBooked}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Appointments Completed</span>
              <span className="text-green-400 font-medium">{roiData.appointmentsCompleted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Close Rate</span>
              <span className="text-white font-medium">{formatPercentage(roiData.closeRate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Average Ticket</span>
              <span className="text-white font-medium">{formatCurrency(roiData.averageTicket)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="mt-6 pt-6 border-t border-gray-700/50">
        <h4 className="text-white font-medium mb-4">Cost Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="text-sm text-gray-400">Monthly Subscription</div>
            <div className="text-lg font-semibold text-white">{formatCurrency(roiData.monthlyCost)}</div>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="text-sm text-gray-400">Per-Booking Fees</div>
            <div className="text-lg font-semibold text-white">{formatCurrency(roiData.appointmentsBooked * roiData.perBookingFee)}</div>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="text-sm text-gray-400">Total Costs</div>
            <div className="text-lg font-semibold text-white">{formatCurrency(roiData.totalFees)}</div>
          </div>
        </div>
      </div>

      {/* ROI Status */}
      <div className="mt-6 pt-6 border-t border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {roiData.roiPercentage > 0 ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-white font-medium">
              {roiData.roiPercentage > 0 ? 'Positive ROI' : 'Negative ROI'}
            </span>
          </div>
          <div className={`text-lg font-bold ${roiData.roiPercentage > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercentage(roiData.roiPercentage)}
          </div>
        </div>
      </div>
    </div>
  )
}