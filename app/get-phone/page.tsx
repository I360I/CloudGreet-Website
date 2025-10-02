"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Phone, CheckCircle, ArrowLeft, CreditCard, Star } from 'lucide-react'

export default function GetPhonePage() {
  const [selectedPlan, setSelectedPlan] = useState('pro')

  const handleGetPhone = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Please log in to get a phone number')
        return
      }

      // Provision a real phone number
      const provisionResponse = await fetch('/api/phone/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ areaCode: '555' })
      })

      const provisionResult = await provisionResponse.json()

      if (!provisionResult.success) {
        alert(`❌ Error provisioning phone: ${provisionResult.message}`)
        return
      }

      // Activate the agent
      const activateResponse = await fetch('/api/agent/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      })

      const activateResult = await activateResponse.json()

      if (activateResult.success) {
        alert(`🎉 Success! Your AI receptionist is now live!\n\nPhone: ${provisionResult.phoneNumber}\n\nYour AI will now handle all calls to this number professionally.`)
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        alert(`❌ Error activating agent: ${activateResult.message}`)
      }
    } catch (error) {
      alert('❌ Failed to get phone number. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Get Your Phone Number</h1>
            <p className="text-gray-400">Choose a plan and get your AI receptionist phone number</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Current Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Ready for Your Phone Number</h2>
                <p className="text-gray-400">Choose a plan to activate your AI receptionist</p>
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm">
                <strong>What you'll get:</strong> A dedicated phone number, AI call handling, appointment scheduling, and 24/7 availability.
              </p>
            </div>
          </motion.div>

          {/* Pricing Plans */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Free Trial */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-white/5 backdrop-blur-xl border rounded-2xl p-6 cursor-pointer transition-all ${
                selectedPlan === 'trial' 
                  ? 'border-purple-500/50 bg-purple-500/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
              onClick={() => setSelectedPlan('trial')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Free Trial</h3>
                <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                  <span className="text-green-400 text-sm font-medium">7 Days Free</span>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="text-3xl font-bold mb-2">$0</div>
                <div className="text-gray-400 text-sm">Then $200/month</div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Dedicated phone number</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">AI call handling</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Appointment scheduling</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">24/7 availability</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">+$50 per booking</span>
                </li>
              </ul>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-white/5 backdrop-blur-xl border rounded-2xl p-6 cursor-pointer transition-all ${
                selectedPlan === 'pro' 
                  ? 'border-purple-500/50 bg-purple-500/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
              onClick={() => setSelectedPlan('pro')}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Pro Plan</h3>
                <div className="flex items-center gap-1 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                  <Star className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 text-sm font-medium">Popular</span>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="text-3xl font-bold mb-2">$200</div>
                <div className="text-gray-400 text-sm">per month</div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Everything in Free Trial</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Advanced AI features</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Custom greetings</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Analytics dashboard</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Priority support</span>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Get Phone Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <motion.button
              onClick={handleGetPhone}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-12 py-4 rounded-2xl text-xl font-semibold transition-all flex items-center gap-3 mx-auto"
            >
              <Phone className="w-6 h-6" />
              Get My Phone Number
              <CreditCard className="w-5 h-5" />
            </motion.button>
            
            <p className="text-gray-400 text-sm mt-4">
              {selectedPlan === 'trial' 
                ? 'Start with 7 days free, then $200/month + $50 per booking'
                : 'Billed $200/month + $50 per booking'
              }
            </p>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 grid md:grid-cols-3 gap-6"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Instant Activation</h3>
              <p className="text-gray-400 text-sm">Your phone number is assigned immediately and ready to receive calls.</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Setup Required</h3>
              <p className="text-gray-400 text-sm">Your AI receptionist is pre-configured and ready to handle calls professionally.</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Professional Service</h3>
              <p className="text-gray-400 text-sm">24/7 availability with professional call handling and appointment scheduling.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
