'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, PhoneCall, CheckCircle, AlertCircle, 
  Loader2, Zap, Settings, ExternalLink 
} from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

interface CallTestWidgetProps {
  businessName: string
  phoneNumber?: string
  onTestComplete?: () => void
}

export default function CallTestWidget({ businessName, phoneNumber, onTestComplete }: CallTestWidgetProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [testPhone, setTestPhone] = useState('')
  const { showSuccess, showError } = useToast()

  const runCallTest = async () => {
    setIsLoading(true)
    setTestResults(null)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showError('Please log in to test call flow')
        return
      }

      const response = await fetch('/api/test/call-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          testPhoneNumber: testPhone || undefined
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTestResults(data.testResults)
        showSuccess('Call flow test completed successfully!')
        
        if (onTestComplete) {
          onTestComplete()
        }
      } else {
        throw new Error(data.message || 'Call test failed')
      }
    } catch (error) {
      console.error('Call test error:', error)
      showError(error instanceof Error ? error.message : 'Failed to test call flow')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400 bg-green-500/20'
    if (status >= 400 && status < 500) return 'text-yellow-400 bg-yellow-500/20'
    return 'text-red-400 bg-red-500/20'
  }

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4" />
    if (status >= 400 && status < 500) return <AlertCircle className="w-4 h-4" />
    return <AlertCircle className="w-4 h-4" />
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
          <PhoneCall className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Call Flow Test</h3>
          <p className="text-sm text-gray-400">Test your AI receptionist with a simulated call</p>
        </div>
      </div>

      {!testResults ? (
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Phone className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Business Phone</span>
            </div>
            <p className="text-white font-mono text-sm">
              {phoneNumber || 'No phone number configured'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Test Phone Number (optional)
            </label>
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+15551234567"
              className="w-full p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use default test number
            </p>
          </div>

          <button
            onClick={runCallTest}
            disabled={isLoading || !phoneNumber}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Testing Call Flow...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Test Call Flow</span>
              </>
            )}
          </button>

          {!phoneNumber && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400">Setup Required</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Configure your phone number first to test the call flow
              </p>
              <button
                onClick={() => window.location.href = '/settings'}
                className="mt-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
              >
                <Settings className="w-3 h-3" />
                <span>Go to Settings</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          {/* Test Results Summary */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium text-green-400">Test Completed</span>
            </div>
            <p className="text-sm text-gray-400">
              Call flow test completed successfully
            </p>
          </div>

          {/* Webhook Status */}
          <div className="space-y-3">
            <h4 className="font-medium text-white">Test Results</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Webhook Status</div>
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(testResults.webhookStatus)}`}>
                  {getStatusIcon(testResults.webhookStatus)}
                  <span>{testResults.webhookStatus}</span>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Agent Status</div>
                <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium text-green-400 bg-green-500/20">
                  <CheckCircle className="w-3 h-3" />
                  <span>Active</span>
                </div>
              </div>
            </div>

            {/* Webhook URL */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Webhook URL</div>
              <div className="flex items-center space-x-2">
                <code className="text-xs text-blue-400 bg-black/20 px-2 py-1 rounded flex-1 truncate">
                  {testResults.webhookUrl}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(testResults.webhookUrl)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Agent Greeting */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">AI Agent Greeting</div>
              <p className="text-sm text-white italic">
                "{testResults.agentGreeting}"
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setTestResults(null)
              setTestPhone('')
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Run Another Test
          </button>
        </motion.div>
      )}

      <div className="mt-6 p-4 bg-black/20 rounded-lg">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Zap className="w-4 h-4 text-green-400" />
          <span>
            <strong>What this tests:</strong> Webhook connectivity, AI agent response, and call logging
          </span>
        </div>
      </div>
    </div>
  )
}
