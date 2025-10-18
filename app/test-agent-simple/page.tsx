"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ClickToCallOrb = dynamic(() => import('../components/ClickToCallOrb'), {
  ssr: false,
  loading: () => <div className="w-96 h-96 rounded-full bg-black border-2 border-gray-800 animate-pulse flex items-center justify-center"><div className="text-white">Loading Voice AI...</div></div>
})

export default function TestAgentSimplePage() {
  const [businessInfo, setBusinessInfo] = useState({
    businessName: 'Your Business',
    businessType: 'Service Business',
    services: 'General services',
    hours: '9 AM - 5 PM'
  })

  // Load business info from API
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/business/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setBusinessInfo({
              businessName: data.data.businessName || 'Your Business',
              businessType: data.data.businessType || 'Service Business',
              services: data.data.services?.join(', ') || 'General services',
              hours: formatBusinessHours(data.data.businessHours) || '9 AM - 5 PM'
            })
          }
        })
        .catch(err => console.error('Failed to load business info:', err))
    }
  }, [])

  const formatBusinessHours = (hours: any) => {
    if (!hours) return '9 AM - 5 PM'
    // Format first available day
    const firstDay = Object.values(hours)[0] as any
    return firstDay?.open && firstDay?.close ? `${firstDay.open} - ${firstDay.close}` : '9 AM - 5 PM'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-gray-800/50 backdrop-blur-md bg-black/20 sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/dashboard" className="flex items-center text-white hover:text-blue-400 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Test Your AI Receptionist
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Experience your AI in action. Click the orb to start a real-time voice conversation.
          </p>
        </motion.div>

        {/* Business Info Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h3 className="text-lg font-semibold mb-4 text-white">Your Business Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Business Name:</span>
              <span className="ml-2 text-white font-medium">{businessInfo.businessName}</span>
            </div>
            <div>
              <span className="text-gray-400">Type:</span>
              <span className="ml-2 text-white font-medium">{businessInfo.businessType}</span>
            </div>
            <div>
              <span className="text-gray-400">Services:</span>
              <span className="ml-2 text-white font-medium">{businessInfo.services}</span>
            </div>
            <div>
              <span className="text-gray-400">Hours:</span>
              <span className="ml-2 text-white font-medium">{businessInfo.hours}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            The AI will use this information during conversations. Update in Settings.
          </p>
        </motion.div>

        {/* Voice Demo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <ClickToCallOrb
            businessName={businessInfo.businessName}
            businessType={businessInfo.businessType}
            services={businessInfo.services}
            hours={businessInfo.hours}
          />
        </motion.div>

        {/* Testing Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4 text-blue-400">💡 Testing Tips</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✓ Ask about your services and hours</li>
            <li>✓ Try booking an appointment</li>
            <li>✓ Ask pricing questions</li>
            <li>✓ Test how the AI handles objections</li>
            <li>✓ Verify the AI sounds natural and professional</li>
            <li>✓ Check response speed (should be under 1 second)</li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
