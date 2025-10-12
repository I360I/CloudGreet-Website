'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Phone, Calendar, Zap } from 'lucide-react'

export default function RoiCalculator() {
  const [missedCalls, setMissedCalls] = useState(10)
  const [avgJobValue, setAvgJobValue] = useState(2500)
  const [closeRate, setCloseRate] = useState(30)
  
  // Calculate ROI
  const missedRevenue = (missedCalls * (closeRate / 100) * avgJobValue).toFixed(0)
  const annualMissedRevenue = (parseFloat(missedRevenue) * 12).toFixed(0)
  const cloudGreetCost = 299
  const annualCost = cloudGreetCost * 12
  const recoveredRevenue = (parseFloat(missedRevenue) * 0.8).toFixed(0) // 80% recovery rate
  const annualRecoveredRevenue = (parseFloat(recoveredRevenue) * 12).toFixed(0)
  const netGain = (parseFloat(annualRecoveredRevenue) - annualCost).toFixed(0)
  const roi = ((parseFloat(netGain) / annualCost) * 100).toFixed(0)

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h3 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          Calculate Your ROI
        </h3>
        <p className="text-gray-400 text-lg">
          See how much revenue you're losing to missed calls
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Left: Inputs */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-8"
        >
          {/* Missed Calls */}
          <div>
            <label className="flex items-center justify-between text-white font-semibold mb-3">
              <span className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-red-400" />
                Missed Calls Per Month
              </span>
              <span className="text-3xl font-bold text-red-400">{missedCalls}</span>
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={missedCalls}
              onChange={(e) => setMissedCalls(parseInt(e.target.value))}
              className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Average Job Value */}
          <div>
            <label className="flex items-center justify-between text-white font-semibold mb-3">
              <span className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Average Job Value
              </span>
              <span className="text-3xl font-bold text-green-400">${avgJobValue}</span>
            </label>
            <input
              type="range"
              min="500"
              max="10000"
              step="100"
              value={avgJobValue}
              onChange={(e) => setAvgJobValue(parseInt(e.target.value))}
              className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>$500</span>
              <span>$10,000</span>
            </div>
          </div>

          {/* Close Rate */}
          <div>
            <label className="flex items-center justify-between text-white font-semibold mb-3">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Close Rate
              </span>
              <span className="text-3xl font-bold text-blue-400">{closeRate}%</span>
            </label>
            <input
              type="range"
              min="10"
              max="80"
              value={closeRate}
              onChange={(e) => setCloseRate(parseInt(e.target.value))}
              className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>10%</span>
              <span>80%</span>
            </div>
          </div>
        </motion.div>

        {/* Right: Results */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          {/* Monthly Lost Revenue */}
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-300 text-sm font-medium">Monthly Lost Revenue</span>
              <Zap className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-red-400">
              ${parseInt(missedRevenue).toLocaleString()}
            </div>
            <div className="text-red-300/70 text-sm mt-2">
              From {missedCalls} missed calls per month
            </div>
          </div>

          {/* Annual Impact */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-300 text-sm font-medium">Annual Lost Revenue</span>
              <Calendar className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-yellow-400">
              ${parseInt(annualMissedRevenue).toLocaleString()}
            </div>
            <div className="text-yellow-300/70 text-sm mt-2">
              That's revenue walking away every year
            </div>
          </div>

          {/* With CloudGreet */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-300 text-sm font-medium">Annual Revenue Recovered</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-green-400">
              ${parseInt(annualRecoveredRevenue).toLocaleString()}
            </div>
            <div className="text-green-300/70 text-sm mt-2">
              80% of missed calls converted to bookings
            </div>
          </div>

          {/* Net Gain */}
          <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-300 text-sm font-medium">Annual Net Gain</span>
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-blue-400">
              ${parseInt(netGain).toLocaleString()}
            </div>
            <div className="text-blue-300/70 text-sm mt-2">
              After CloudGreet subscription (${cloudGreetCost}/mo)
            </div>
          </div>

          {/* ROI */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-300 text-sm font-medium">Return on Investment</span>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {roi}% ROI
            </div>
            <div className="text-purple-300/70 text-sm mt-2">
              For every $1 spent, earn ${(parseFloat(roi)/100 + 1).toFixed(2)}
            </div>
          </div>

          {/* CTA */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <a
              href="/register-simple"
              className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-center font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Start Recovering Revenue Today →
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Note */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-10 text-center"
      >
        <p className="text-gray-400 text-sm">
          ⚡ <span className="text-white font-semibold">Real Results</span>: Most contractors see 40-60% increase in bookings within 30 days
        </p>
      </motion.div>
    </div>
  )
}
