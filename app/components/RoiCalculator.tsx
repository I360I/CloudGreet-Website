'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Phone, Zap } from 'lucide-react'

export default function RoiCalculator() {
  const [missedCalls, setMissedCalls] = useState(10)
  const [avgJobValue, setAvgJobValue] = useState(2500)
  const [closeRate, setCloseRate] = useState(30)
  
  // Calculate ROI
  const missedRevenue = (missedCalls * (closeRate / 100) * avgJobValue).toFixed(0)
  const annualMissedRevenue = (parseFloat(missedRevenue) * 12).toFixed(0)
  const cloudGreetCost = 299
  const annualCost = cloudGreetCost * 12
  const recoveredRevenue = (parseFloat(missedRevenue) * 0.8).toFixed(0)
  const annualRecoveredRevenue = (parseFloat(recoveredRevenue) * 12).toFixed(0)
  const netGain = (parseFloat(annualRecoveredRevenue) - annualCost).toFixed(0)
  const roi = ((parseFloat(netGain) / annualCost) * 100).toFixed(0)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h3 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          Calculate Your ROI
        </h3>
        <p className="text-gray-400 text-lg">
          See how much revenue you're losing to missed calls
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Inputs */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-400" />
                Missed Calls/Month
              </span>
              <span className="text-2xl font-bold text-red-400">{missedCalls}</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={missedCalls}
              onChange={(e) => setMissedCalls(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                Avg Job Value
              </span>
              <span className="text-2xl font-bold text-green-400">${avgJobValue.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="500"
              max="10000"
              step="100"
              value={avgJobValue}
              onChange={(e) => setAvgJobValue(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>$500</span>
              <span>$10k</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Close Rate
              </span>
              <span className="text-2xl font-bold text-blue-400">{closeRate}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              value={closeRate}
              onChange={(e) => setCloseRate(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>10%</span>
              <span>80%</span>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Lost Revenue */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <div className="text-sm text-red-300 mb-1">You're Losing Annually</div>
            <div className="text-4xl font-bold text-red-400 mb-1">
              ${parseInt(annualMissedRevenue).toLocaleString()}
            </div>
            <div className="text-xs text-red-300/60">From {missedCalls} missed calls/month</div>
          </div>

          {/* Recovered */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <div className="text-sm text-green-300 mb-1">CloudGreet Recovers</div>
            <div className="text-4xl font-bold text-green-400 mb-1">
              ${parseInt(annualRecoveredRevenue).toLocaleString()}
            </div>
            <div className="text-xs text-green-300/60">80% recovery rate</div>
          </div>

          {/* Net Profit */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <div className="text-sm text-blue-300 mb-1">Annual Net Profit</div>
            <div className="text-4xl font-bold text-blue-400 mb-1">
              ${parseInt(netGain).toLocaleString()}
            </div>
            <div className="text-xs text-blue-300/60">After ${cloudGreetCost}/mo subscription</div>
          </div>

          {/* ROI */}
          <div className="bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/40 rounded-xl p-6">
            <div className="text-sm text-purple-200 mb-1">Return on Investment</div>
            <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent mb-1">
              {roi}%
            </div>
            <div className="text-xs text-purple-300/60">Every $1 → ${(parseFloat(roi)/100 + 1).toFixed(2)}</div>
          </div>

          {/* CTA */}
          <motion.a
            href="/register-simple"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-center font-bold py-4 rounded-xl transition-all shadow-lg"
          >
            Start Recovering Revenue →
          </motion.a>
        </div>
      </div>

      {/* Bottom Note */}
      <div className="mt-8 text-center">
        <p className="text-gray-400 text-sm">
          ⚡ Most contractors see <span className="text-white font-semibold">40-60% more bookings</span> within 30 days
        </p>
      </div>
    </div>
  )
}
