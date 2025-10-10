'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, Phone, Calendar, Target, ArrowUp, Sparkles } from 'lucide-react'

interface ROIData {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  appointmentsBooked: number
  estimatedRevenue: number
  platformCost: number
  netROI: number
  roiPercentage: number
  callsRecovered: number
  recoveryRevenue: number
}

interface ROICalculatorProps {
  businessId: string
  className?: string
}

export default function ROICalculator({ businessId, className = '' }: ROICalculatorProps) {
  const [roiData, setRoiData] = useState<ROIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [settings] = useState({
    avgTicketSize: 750,
    closeRate: 35,
    missedCallRecoveryRate: 60
  })

  useEffect(() => {
    if (!businessId) {
      setLoading(false)
      return
    }
    
    loadROIData()
    // Refresh every 30 seconds
    const interval = setInterval(loadROIData, 30000)
    return () => clearInterval(interval)
  }, [businessId])

  const loadROIData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      // Fetch call and appointment data
      const [callsRes, appointmentsRes] = await Promise.all([
        fetch('/api/calls/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/appointments/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const callsData = await callsRes.json()
      const appointmentsData = await appointmentsRes.json()

      // Calculate ROI metrics
      const calls = callsData.calls || []
      const appointments = appointmentsData.appointments || []

      const totalCalls = calls.length
      const answeredCalls = calls.filter((c: any) => c.status === 'answered' || c.status === 'completed').length
      const missedCalls = calls.filter((c: any) => c.status === 'missed' || c.status === 'no-answer').length
      const callsRecovered = calls.filter((c: any) => c.recovery_sms_sent).length
      const appointmentsBooked = appointments.length

      // Calculate revenue
      const estimatedRevenue = appointmentsBooked * settings.avgTicketSize * (settings.closeRate / 100)
      const recoveryRevenue = callsRecovered * settings.avgTicketSize * (settings.closeRate / 100) * (settings.missedCallRecoveryRate / 100)
      
      // Calculate platform cost (base subscription + per-booking fees)
      const subscriptionCost = 200 // $200/month base
      const bookingFees = appointmentsBooked * 50 // $50 per booking
      const platformCost = subscriptionCost + bookingFees

      // Calculate net ROI
      const totalRevenue = estimatedRevenue + recoveryRevenue
      const netROI = totalRevenue - platformCost
      const roiPercentage = platformCost > 0 ? ((netROI / platformCost) * 100) : 0

      setRoiData({
        totalCalls,
        answeredCalls,
        missedCalls,
        appointmentsBooked,
        estimatedRevenue: totalRevenue,
        platformCost,
        netROI,
        roiPercentage,
        callsRecovered,
        recoveryRevenue
      })

      setLoading(false)
    } catch (error) {
      setLoading(false)
    }
  }

  if (!businessId) {
    return null
  }

  if (loading || !roiData) {
    return (
      <div className={`bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl border border-green-500/20 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-white/10 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-white/10 rounded"></div>
            <div className="h-16 bg-white/10 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl border border-green-500/20 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-green-500/20 rounded-xl">
            <TrendingUp className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">ROI Calculator</h3>
            <p className="text-sm text-gray-400">Real-time revenue tracking</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full">
          <Sparkles className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-green-400">Live</span>
        </div>
      </div>

      {/* Main ROI Display */}
      <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-xl p-6 mb-6 border border-green-500/30">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-2">Estimated Revenue Generated</p>
          <div className="flex items-center justify-center space-x-2">
            <DollarSign className="w-8 h-8 text-green-400" />
            <motion.span
              key={roiData.estimatedRevenue}
              initial={{ scale: 1.2, color: '#4ade80' }}
              animate={{ scale: 1, color: '#ffffff' }}
              className="text-5xl font-bold text-white"
            >
              {roiData.estimatedRevenue.toLocaleString()}
            </motion.span>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div>
                <span className="text-gray-400">Platform Cost: </span>
                <span className="text-white font-semibold">${roiData.platformCost.toLocaleString()}</span>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <div>
                <span className="text-gray-400">Net Profit: </span>
                <span className={`font-semibold ${roiData.netROI > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${roiData.netROI.toLocaleString()}
                </span>
              </div>
            </div>
            
            {roiData.roiPercentage > 0 && (
              <div className="mt-3 flex items-center justify-center space-x-2">
                <ArrowUp className="w-5 h-5 text-green-400" />
                <span className="text-2xl font-bold text-green-400">
                  {roiData.roiPercentage.toFixed(0)}% ROI
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Phone className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Total Calls</span>
          </div>
          <p className="text-2xl font-bold text-white">{roiData.totalCalls}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Appointments</span>
          </div>
          <p className="text-2xl font-bold text-white">{roiData.appointmentsBooked}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Recovered</span>
          </div>
          <p className="text-2xl font-bold text-white">{roiData.callsRecovered}</p>
        </div>

        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Answer Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {roiData.totalCalls > 0 ? Math.round((roiData.answeredCalls / roiData.totalCalls) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Recovery Impact */}
      {roiData.callsRecovered > 0 && (
        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Missed Call Recovery Impact</p>
              <p className="text-lg font-bold text-white">
                +${roiData.recoveryRevenue.toLocaleString()} recovered revenue
              </p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* Calculation Details */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <details className="text-sm text-gray-400">
          <summary className="cursor-pointer hover:text-gray-300 transition-colors">
            How is this calculated?
          </summary>
          <div className="mt-3 space-y-2 pl-4">
            <p>• Revenue = Appointments × Avg Ticket (${settings.avgTicketSize}) × Close Rate ({settings.closeRate}%)</p>
            <p>• Recovery Revenue = Recovered Calls × Avg Ticket × Close Rate × Recovery Rate ({settings.missedCallRecoveryRate}%)</p>
            <p>• Platform Cost = Base Subscription ($200) + Booking Fees ({roiData.appointmentsBooked} × $50)</p>
            <p>• Net ROI = Total Revenue - Platform Cost</p>
          </div>
        </details>
      </div>
    </motion.div>
  )
}
