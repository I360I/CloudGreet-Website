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
    <div className="bg-gradient-to-br from-white/10 via-white/5 to-purple-500/5 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-8 md:p-16 shadow-[0_20px_80px_rgba(0,0,0,0.3)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-14"
      >
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="inline-block mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_10px_40px_rgba(147,51,234,0.4)]">
            <DollarSign className="w-10 h-10 text-white" />
          </div>
        </motion.div>
        <h3 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
          Calculate Your ROI
        </h3>
        <p className="text-gray-300 text-xl max-w-2xl mx-auto leading-relaxed">
          Discover exactly how much revenue you're losing to missed calls — and how much CloudGreet can recover
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
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <label className="flex items-center justify-between text-white font-semibold mb-4">
              <span className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-red-400" />
                </div>
                Missed Calls Per Month
              </span>
              <span className="text-4xl font-bold bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">{missedCalls}</span>
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={missedCalls}
              onChange={(e) => setMissedCalls(parseInt(e.target.value))}
              className="w-full h-4 bg-gradient-to-r from-red-900/30 to-red-800/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-red-400 [&::-webkit-slider-thumb]:to-red-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_4px_20px_rgba(239,68,68,0.5)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20"
            />
            <div className="flex justify-between text-sm text-red-300/70 mt-3 font-medium">
              <span>1 call</span>
              <span>50 calls</span>
            </div>
          </div>

          {/* Average Job Value */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 border border-green-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <label className="flex items-center justify-between text-white font-semibold mb-4">
              <span className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-400/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                Average Job Value
              </span>
              <span className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">${avgJobValue.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min="500"
              max="10000"
              step="100"
              value={avgJobValue}
              onChange={(e) => setAvgJobValue(parseInt(e.target.value))}
              className="w-full h-4 bg-gradient-to-r from-green-900/30 to-emerald-800/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-green-400 [&::-webkit-slider-thumb]:to-emerald-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_4px_20px_rgba(34,197,94,0.5)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20"
            />
            <div className="flex justify-between text-sm text-green-300/70 mt-3 font-medium">
              <span>$500</span>
              <span>$10,000</span>
            </div>
          </div>

          {/* Close Rate */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-600/5 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <label className="flex items-center justify-between text-white font-semibold mb-4">
              <span className="flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                Close Rate
              </span>
              <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">{closeRate}%</span>
            </label>
            <input
              type="range"
              min="10"
              max="80"
              value={closeRate}
              onChange={(e) => setCloseRate(parseInt(e.target.value))}
              className="w-full h-4 bg-gradient-to-r from-blue-900/30 to-cyan-800/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-blue-400 [&::-webkit-slider-thumb]:to-cyan-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_4px_20px_rgba(59,130,246,0.5)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20"
            />
            <div className="flex justify-between text-sm text-blue-300/70 mt-3 font-medium">
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
          <motion.div 
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-gradient-to-br from-red-500/20 via-red-600/15 to-red-700/10 border-2 border-red-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(239,68,68,0.2)] hover:shadow-[0_12px_48px_rgba(239,68,68,0.3)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-red-200 text-base font-semibold uppercase tracking-wide">Lost Monthly</span>
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center">
                <Zap className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <div className="text-5xl md:text-6xl font-black bg-gradient-to-br from-red-300 to-red-500 bg-clip-text text-transparent mb-2">
              ${parseInt(missedRevenue).toLocaleString()}
            </div>
            <div className="text-red-200/60 text-sm font-medium">
              💔 {missedCalls} missed opportunities
            </div>
          </motion.div>

          {/* Annual Impact */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-amber-600/10 border-2 border-yellow-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(251,191,36,0.2)] hover:shadow-[0_12px_48px_rgba(251,191,36,0.3)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-yellow-200 text-base font-semibold uppercase tracking-wide">Lost Annually</span>
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-400/40 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-5xl md:text-6xl font-black bg-gradient-to-br from-yellow-300 to-orange-500 bg-clip-text text-transparent mb-2">
              ${parseInt(annualMissedRevenue).toLocaleString()}
            </div>
            <div className="text-yellow-200/60 text-sm font-medium">
              📉 Revenue walking away every year
            </div>
          </motion.div>

          {/* With CloudGreet */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-gradient-to-br from-green-500/20 via-emerald-500/15 to-teal-600/10 border-2 border-green-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(34,197,94,0.2)] hover:shadow-[0_12px_48px_rgba(34,197,94,0.3)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-green-200 text-base font-semibold uppercase tracking-wide">Recovered</span>
              <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-400/40 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <div className="text-5xl md:text-6xl font-black bg-gradient-to-br from-green-300 to-emerald-500 bg-clip-text text-transparent mb-2">
              ${parseInt(annualRecoveredRevenue).toLocaleString()}
            </div>
            <div className="text-green-200/60 text-sm font-medium">
              ✨ 80% of missed calls converted annually
            </div>
          </motion.div>

          {/* Net Gain */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-600/10 border-2 border-blue-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(59,130,246,0.2)] hover:shadow-[0_12px_48px_rgba(59,130,246,0.3)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-blue-200 text-base font-semibold uppercase tracking-wide">Net Profit</span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="text-5xl md:text-6xl font-black bg-gradient-to-br from-blue-300 to-indigo-500 bg-clip-text text-transparent mb-2">
              ${parseInt(netGain).toLocaleString()}
            </div>
            <div className="text-blue-200/60 text-sm font-medium">
              💰 After ${cloudGreetCost}/mo subscription
            </div>
          </motion.div>

          {/* ROI - Featured Card */}
          <motion.div
            whileHover={{ scale: 1.03, y: -8 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative bg-gradient-to-br from-purple-500/30 via-fuchsia-500/20 to-pink-600/15 border-2 border-purple-400/40 rounded-3xl p-10 backdrop-blur-xl shadow-[0_20px_60px_rgba(168,85,247,0.4)] hover:shadow-[0_24px_80px_rgba(168,85,247,0.5)] overflow-hidden"
          >
            {/* Animated background gradient */}
            <motion.div
              animate={{
                opacity: [0.3, 0.5, 0.3],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-fuchsia-500/10 to-pink-600/20 blur-2xl"
            />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-purple-100 text-lg font-bold uppercase tracking-wider">ROI</span>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-400/50 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-purple-300" />
                </div>
              </div>
              <div className="text-6xl md:text-7xl font-black bg-gradient-to-r from-purple-200 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent mb-3 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                {roi}%
              </div>
              <div className="text-purple-100/70 text-base font-semibold">
                🚀 Every $1 → ${(parseFloat(roi)/100 + 1).toFixed(2)} return
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <a
              href="/register-simple"
              className="relative block w-full bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-600 hover:from-blue-500 hover:via-purple-500 hover:to-fuchsia-500 text-white text-center font-black text-lg py-6 px-8 rounded-2xl transition-all shadow-[0_10px_40px_rgba(147,51,234,0.4)] hover:shadow-[0_15px_60px_rgba(147,51,234,0.6)] overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <Zap className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                Start Recovering Revenue Today
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Note */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-center"
      >
        <div className="inline-block bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-fuchsia-500/10 border border-white/10 rounded-2xl px-8 py-4 backdrop-blur-sm">
          <p className="text-gray-200 text-base">
            ⚡ <span className="text-white font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Real Results</span>: Most contractors see <span className="text-green-400 font-bold">40-60% increase</span> in bookings within <span className="text-white font-semibold">30 days</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
