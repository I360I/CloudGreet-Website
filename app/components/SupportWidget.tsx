'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  HelpCircle, CheckCircle, AlertCircle, Clock, 
  Phone, Settings, Zap, Target, ExternalLink,
  Loader2, Sparkles, TrendingUp
} from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface SupportWidgetProps {
  businessName: string
}

interface SetupIssue {
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  action: string
  priority: 'high' | 'medium' | 'low'
}

interface SuccessTip {
  id: string
  title: string
  description: string
  action: string
  impact: 'high' | 'medium' | 'low'
  timeRequired: string
}

export default function SupportWidget({ businessName }: SupportWidgetProps) {
  const [setupIssues, setSetupIssues] = useState<SetupIssue[]>([])
  const [successTips, setSuccessTips] = useState<SuccessTip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'setup' | 'tips'>('setup')
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    loadSupportData()
  }, [])

  const loadSupportData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Load setup status
      const setupResponse = await fetch('/api/support/proactive-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'check_setup_completion'
        })
      })

      if (setupResponse.ok) {
        const setupData = await setupResponse.json()
        setSetupIssues(setupData.data.issues || [])
      }

      // Load success tips
      const tipsResponse = await fetch('/api/support/proactive-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'get_success_tips'
        })
      })

      if (tipsResponse.ok) {
        const tipsData = await tipsResponse.json()
        setSuccessTips(tipsData.data.tips || [])
      }
    } catch (error) {
      console.error('Failed to load support data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (action: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      switch (action) {
        case 'test_agent':
          window.location.href = '/test-agent'
          break
        case 'setup_phone':
          window.location.href = '/settings'
          break
        case 'activate_agent':
          window.location.href = '/settings'
          break
        case 'generate_leads':
          // Trigger quick start
          showSuccess('Use the Quick Start widget to generate demo leads!')
          break
        case 'setup_hours':
          window.location.href = '/settings'
          break
        case 'customize_greeting':
          window.location.href = '/settings'
          break
        default:
          showError('Action not implemented yet')
      }
    } catch (error) {
      showError('Failed to execute action')
    }
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          icon: 'text-red-400',
          iconBg: 'bg-red-500/20'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20',
          icon: 'text-yellow-400',
          iconBg: 'bg-yellow-500/20'
        }
      case 'info':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          icon: 'text-blue-400',
          iconBg: 'bg-blue-500/20'
        }
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20',
          icon: 'text-gray-400',
          iconBg: 'bg-gray-500/20'
        }
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-green-400 bg-green-500/20'
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20'
      case 'low':
        return 'text-blue-400 bg-blue-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin mr-3" />
          <span className="text-gray-300">Loading support data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Setup Assistant</h3>
          <p className="text-sm text-gray-400">Get your AI receptionist running perfectly</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-black/20 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('setup')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'setup'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Setup Status
        </button>
        <button
          onClick={() => setActiveTab('tips')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'tips'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Success Tips
        </button>
      </div>

      {/* Setup Status Tab */}
      {activeTab === 'setup' && (
        <div className="space-y-4">
          {setupIssues.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Setup Complete!</h4>
              <p className="text-gray-400">Your AI receptionist is ready to handle calls</p>
            </motion.div>
          ) : (
            setupIssues.map((issue, index) => {
              const colors = getIssueColor(issue.type)
              const Icon = issue.type === 'critical' ? AlertCircle : Clock

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${colors.bg} ${colors.border} border rounded-xl p-4`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 ${colors.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${colors.icon}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">{issue.title}</h4>
                      <p className="text-sm text-gray-400 mb-3">{issue.description}</p>
                      <button
                        onClick={() => handleAction(issue.action)}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors"
                      >
                        Fix Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      {/* Success Tips Tab */}
      {activeTab === 'tips' && (
        <div className="space-y-4">
          {successTips.map((tip, index) => {
            const impactColors = getImpactColor(tip.impact)

            return (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-white">{tip.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${impactColors}`}>
                        {tip.impact} impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{tip.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{tip.timeRequired}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAction(tip.action)}
                    className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
                  >
                    <span>Do It</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Quick Contact */}
      <div className="mt-6 p-4 bg-black/20 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Need help?</p>
            <p className="text-xs text-gray-400">Our support team is here to help you succeed</p>
          </div>
        </div>
      </div>
    </div>
  )
}
