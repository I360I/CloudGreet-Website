'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Settings, CheckCircle, AlertCircle, Brain, Loader2, Phone, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '../contexts/ToastContext'
import VoiceDemo from '../components/VoiceDemo'

export default function TestAgentPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    phoneNumber: '',
    greetingMessage: '',
    isActive: false
  })
  const [agentStatus, setAgentStatus] = useState<'loading' | 'active' | 'inactive' | 'error'>('loading')
  const { showSuccess, showError } = useToast()

  const loadBusinessInfo = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showError('Please log in to test your agent')
        return
      }

      const response = await fetch('/api/business/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBusinessInfo({
            businessName: data.data.businessName || 'Your Business',
            phoneNumber: data.data.phone || 'Not configured',
            greetingMessage: data.data.greetingMessage || 'Hello! Thank you for calling. How can I help you today?',
            isActive: data.data.onboardingCompleted || false
          })
          setAgentStatus(data.data.onboardingCompleted ? 'active' : 'inactive')
        }
      }
    } catch (error) {
      console.error('Failed to load business info:', error)
      showError('Failed to load business information')
      setAgentStatus('error')
    }
  }

  useEffect(() => {
    loadBusinessInfo()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/dashboard" 
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              agentStatus === 'active' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : agentStatus === 'inactive'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {agentStatus === 'active' && <CheckCircle className="w-4 h-4" />}
              {agentStatus === 'inactive' && <AlertCircle className="w-4 h-4" />}
              {agentStatus === 'error' && <AlertCircle className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {agentStatus === 'active' ? 'Agent Active' : 
                 agentStatus === 'inactive' ? 'Setup Required' : 'Error'}
              </span>
            </div>
            
            <Link
              href="/settings"
              className="flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5 mr-2" />
              Settings
            </Link>
          </div>
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Test Your AI Agent
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-300 max-w-2xl mx-auto"
          >
            Experience real conversation with your AI receptionist using voice recognition and speech synthesis
          </motion.p>
        </div>

        {/* Business Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Brain className="w-6 h-6 mr-3 text-purple-400" />
            Agent Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Business Name</label>
              <p className="text-white font-medium">{businessInfo.businessName || 'Not configured'}</p>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 block mb-2">Phone Number</label>
              <p className="text-white font-medium flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                {businessInfo.phoneNumber}
              </p>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 block mb-2">Status</label>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                agentStatus === 'active' 
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {agentStatus === 'active' ? 'Ready to Test' : 'Setup Required'}
              </div>
            </div>
          </div>
          
          {businessInfo.greetingMessage && (
            <div className="mt-6">
              <label className="text-sm text-gray-400 block mb-2">Greeting Message</label>
              <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                <p className="text-white italic">"{businessInfo.greetingMessage}"</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Voice Demo */}
        {agentStatus === 'loading' ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mr-3" />
            <span className="text-gray-300">Loading agent configuration...</span>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <VoiceDemo 
              businessName={businessInfo.businessName}
              greetingMessage={businessInfo.greetingMessage}
            />
          </motion.div>
        )}

        {/* Features Highlight */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
            <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Volume2 className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Real Voice</h3>
            <p className="text-gray-400 text-sm">Actual speech recognition and text-to-speech, not just text simulation</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
            <div className="bg-purple-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Smart Responses</h3>
            <p className="text-gray-400 text-sm">AI understands context and provides relevant, helpful responses</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
            <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Live Demo</h3>
            <p className="text-gray-400 text-sm">Experience exactly how your customers will interact with your AI</p>
          </div>
        </motion.div>

        {/* Call to Action */}
        {agentStatus === 'inactive' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-2">Complete Setup First</h3>
              <p className="text-gray-300 mb-4">Your AI agent needs to be configured before you can test it.</p>
              <Link
                href="/settings"
                className="inline-flex items-center bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Settings className="w-5 h-5 mr-2" />
                Complete Setup
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}