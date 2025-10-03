'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, Users, Calendar, Phone, CheckCircle, 
  Loader2, Sparkles, Target, TrendingUp 
} from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface QuickStartWidgetProps {
  businessName: string
  onDataGenerated?: () => void
}

export default function QuickStartWidget({ businessName, onDataGenerated }: QuickStartWidgetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [completedActions, setCompletedActions] = useState<string[]>([])
  const { showSuccess, showError } = useToast()

  const quickStartActions = [
    {
      id: 'generate_demo_leads',
      title: 'Generate Demo Leads',
      description: 'Create 3 high-quality demo leads to see how lead generation works',
      icon: Users,
      color: 'blue',
      value: '3 leads'
    },
    {
      id: 'create_demo_calls',
      title: 'Create Demo Calls',
      description: 'Add sample call records to see your dashboard in action',
      icon: Phone,
      color: 'green',
      value: '2 calls'
    },
    {
      id: 'schedule_demo_calls',
      title: 'Schedule Demo Appointments',
      description: 'Set up sample appointments to see revenue tracking',
      icon: Calendar,
      color: 'purple',
      value: '2 appointments'
    }
  ]

  const executeAction = async (actionId: string) => {
    setIsLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showError('Please log in to use quick start')
        return
      }

      const response = await fetch('/api/dashboard/quick-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: actionId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCompletedActions(prev => [...prev, actionId])
        showSuccess(data.message)
        
        if (onDataGenerated) {
          onDataGenerated()
        }
      } else {
        throw new Error('Failed to execute action')
      }
    } catch (error) {
      console.error('Quick start error:', error)
      showError('Failed to generate demo data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getActionColor = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          icon: 'text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
      case 'green':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          icon: 'text-green-400',
          button: 'bg-green-600 hover:bg-green-700'
        }
      case 'purple':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20',
          icon: 'text-purple-400',
          button: 'bg-purple-600 hover:bg-purple-700'
        }
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20',
          icon: 'text-gray-400',
          button: 'bg-gray-600 hover:bg-gray-700'
        }
    }
  }

  const isCompleted = (actionId: string) => completedActions.includes(actionId)
  const allCompleted = completedActions.length === quickStartActions.length

  return (
    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Quick Start</h3>
          <p className="text-sm text-gray-400">Generate demo data to see your dashboard in action</p>
        </div>
      </div>

      {allCompleted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Dashboard Ready!</h4>
          <p className="text-gray-400 mb-4">Your dashboard now has demo data. Check out your metrics and activity feed!</p>
          <div className="flex items-center justify-center space-x-2 text-sm text-green-400">
            <Target className="w-4 h-4" />
            <span>3 leads • 2 calls • 2 appointments generated</span>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {quickStartActions.map((action, index) => {
            const colors = getActionColor(action.color)
            const Icon = action.icon
            const completed = isCompleted(action.id)

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${colors.bg} ${colors.border} border rounded-xl p-4 ${
                  completed ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                      {completed ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Icon className={`w-5 h-5 ${colors.icon}`} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{action.title}</h4>
                      <p className="text-sm text-gray-400">{action.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400 font-medium">{action.value}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => executeAction(action.id)}
                    disabled={isLoading || completed}
                    className={`${colors.button} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : completed ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Done</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-black/20 rounded-lg">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span>
            <strong>Pro Tip:</strong> This demo data helps you understand how CloudGreet tracks your real business metrics.
          </span>
        </div>
      </div>
    </div>
  )
}
