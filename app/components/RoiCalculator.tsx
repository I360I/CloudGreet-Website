"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calculator, TrendingUp, DollarSign, Percent, Calendar, HelpCircle } from 'lucide-react'
import { z } from 'zod'

// Validation schema
const roiInputSchema = z.object({
  appointments: z.number().min(0).max(1000),
  closeRate: z.number().min(0).max(100),
  avgTicket: z.number().min(0).max(100000),
  missedCallsPerMonth: z.number().min(0).max(1000),
})

type RoiInputs = z.infer<typeof roiInputSchema>

interface RoiCalculatorProps {
  className?: string
}

export default function RoiCalculator({ className = '' }: RoiCalculatorProps) {
  // Fixed values
  const BOOKING_FEE = 50
  const SUBSCRIPTION = 200

  // State with defaults
  const [inputs, setInputs] = useState<RoiInputs>({
    appointments: 30,
    closeRate: 35,
    avgTicket: 750,
    missedCallsPerMonth: 20,
  })

  const [errors, setErrors] = useState<Partial<RoiInputs>>({})
  const [showTooltip, setShowTooltip] = useState(false)

  // Load from URL params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search)
        const urlInputs = {
          appointments: parseInt(params.get('appointments') || '30'),
          closeRate: parseInt(params.get('closeRate') || '35'),
          avgTicket: parseInt(params.get('avgTicket') || '750'),
          missedCallsPerMonth: parseInt(params.get('missedCallsPerMonth') || '20'),
        }

        // Validate URL params
        const validated = roiInputSchema.parse(urlInputs)
        setInputs(validated)
      } catch (error) {
        // Use defaults if URL params are invalid
        // Console warn removed for production
      }
    }
  }, [])

  // Update URL when inputs change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search)
        params.set('appointments', inputs.appointments.toString())
        params.set('closeRate', inputs.closeRate.toString())
        params.set('avgTicket', inputs.avgTicket.toString())
        params.set('missedCallsPerMonth', inputs.missedCallsPerMonth.toString())
        
        const newUrl = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState({}, '', newUrl)
      } catch (error) {
        // Console warn removed for production
      }
    }
  }, [inputs])

  const handleInputChange = (field: keyof RoiInputs, value: string) => {
    const numValue = parseFloat(value) || 0
    
    try {
      const newInputs = { ...inputs, [field]: numValue }
      roiInputSchema.parse(newInputs)
      setInputs(newInputs)
      setErrors({ ...errors, [field]: undefined })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.issues.find(e => e.path[0] === field)
        setErrors({ ...errors, [field]: fieldError?.message })
      }
    }
  }

  // Calculations
  const additionalAppointments = Math.round(inputs.missedCallsPerMonth * (inputs.closeRate / 100))
  const effectiveAppointments = inputs.appointments + additionalAppointments
  const estimatedRevenue = effectiveAppointments * (inputs.closeRate / 100) * inputs.avgTicket
  const totalCost = SUBSCRIPTION + (effectiveAppointments * BOOKING_FEE)
  const netRoi = estimatedRevenue - totalCost
  const roiPercentage = totalCost > 0 ? (netRoi / totalCost) * 100 : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(num))
  }

  return (
    <div className={`bg-gray-800/50 backdrop-blur-lg rounded-3xl border border-gray-700/50 p-8 ${className}`}>
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <Calculator className="w-8 h-8 text-blue-400" />
          <h2 className="text-3xl font-bold text-white">ROI Calculator</h2>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Show calculation formulas"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </motion.div>
        <p className="text-gray-300">See how much revenue CloudGreet can generate for your business</p>
      </div>

      {/* Tooltip with formulas */}
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6"
        >
          <h4 className="text-blue-400 font-semibold mb-2">Calculation Formulas:</h4>
          <div className="text-sm text-gray-300 space-y-1">
            <div>• Effective Appointments = Appointments × (1 + Missed-Call Recovery %)</div>
            <div>• Estimated Revenue = Effective Appointments × (Close Rate %) × Average Ticket</div>
            <div>• Total Cost = $200 + (Effective Appointments × $50)</div>
            <div>• Net ROI ($) = Estimated Revenue − Total Cost</div>
            <div>• ROI (%) = (Net ROI ÷ Total Cost) × 100</div>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div>
            <label className="block text-gray-300 font-medium mb-3">
              <Calendar className="w-4 h-4 inline mr-2" />
              Appointments per Month
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              value={inputs.appointments}
              onChange={(e) => handleInputChange('appointments', e.target.value)}
              className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.appointments ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="30"
            />
            {errors.appointments && (
              <p className="text-red-400 text-sm mt-1">{errors.appointments}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-3">
              <Percent className="w-4 h-4 inline mr-2" />
              Close Rate %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={inputs.closeRate}
              onChange={(e) => handleInputChange('closeRate', e.target.value)}
              className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.closeRate ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="35"
            />
            {errors.closeRate && (
              <p className="text-red-400 text-sm mt-1">{errors.closeRate}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-3">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Average Ticket $
            </label>
            <input
              type="number"
              min="0"
              max="100000"
              value={inputs.avgTicket}
              onChange={(e) => handleInputChange('avgTicket', e.target.value)}
              className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.avgTicket ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="750"
            />
            {errors.avgTicket && (
              <p className="text-red-400 text-sm mt-1">{errors.avgTicket}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-3">
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Missed Calls Per Month
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              value={inputs.missedCallsPerMonth}
              onChange={(e) => handleInputChange('missedCallsPerMonth', e.target.value)}
              className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.missedCallsPerMonth ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="20"
            />
            <p className="text-gray-400 text-sm mt-1">
              Number of calls you currently miss each month
            </p>
            {errors.missedCallsPerMonth && (
              <p className="text-red-400 text-sm mt-1">{errors.missedCallsPerMonth}</p>
            )}
          </div>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <h3 className="text-green-400 font-semibold mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Estimated Revenue
            </h3>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(estimatedRevenue)}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {formatNumber(inputs.appointments)} current + {formatNumber(additionalAppointments)} recovered = {formatNumber(effectiveAppointments)} total
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-blue-400 font-semibold mb-3">Total Cost</h3>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(totalCost)}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              $200/mo + {formatNumber(effectiveAppointments)} × $50
            </div>
          </div>

          <div className={`border rounded-xl p-6 ${
            netRoi > 0 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <h3 className={`font-semibold mb-3 ${
              netRoi > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              Net ROI
            </h3>
            <div className={`text-3xl font-bold ${
              netRoi > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(netRoi)}
            </div>
            <div className="text-2xl font-semibold text-white mt-2">
              {roiPercentage.toFixed(1)}% ROI
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center pt-4"
          >
            <a
              href="/start"
              className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
            >
              Start Free Setup
            </a>
          </motion.div>
        </motion.div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">
          Estimates only. Edit inputs to match your business.
        </p>
      </div>
    </div>
  )
}
