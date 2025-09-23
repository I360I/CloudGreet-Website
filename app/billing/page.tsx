"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Settings, 
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain
} from 'lucide-react'

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState('active')
  const [nextBillingDate, setNextBillingDate] = useState('')
  const [currentPlan, setCurrentPlan] = useState('Professional')
  const [businessId, setBusinessId] = useState('')

  useEffect(() => {
    // Get business ID from localStorage or API
    const token = localStorage.getItem('token')
    if (token) {
    // Get business ID from user data
    const user = localStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      setBusinessId(userData.business_id || userData.id)
    }
    }
  }, [])

  const handleManageBilling = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ businessId })
      })

      if (response.ok) {
        const { url } = await response.json()
        window.open(url, '_blank')
      } else {
        console.error('Failed to create portal session')
      }
    } catch (error) {
      console.error('Error opening billing portal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
                <ArrowLeft className="w-6 h-6 text-gray-300" />
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">CloudGreet</h1>
                    <p className="text-xs text-gray-400 font-medium">AI RECEPTIONIST</p>
                  </div>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h2>
          <p className="text-gray-400">Manage your subscription, payment methods, and billing information</p>
        </div>

        {/* Current Plan Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-lg bg-blue-600">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Current Plan</h3>
                <p className="text-gray-400">Professional Plan</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              subscriptionStatus === 'active' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {subscriptionStatus === 'active' ? (
                <>
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Active
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Inactive
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-gray-400 text-sm">Base Price</span>
              </div>
              <p className="text-2xl font-bold text-white">$200</p>
              <p className="text-gray-400 text-sm">per month</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Per Booking</span>
              </div>
              <p className="text-2xl font-bold text-white">$50</p>
              <p className="text-gray-400 text-sm">per appointment</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-gray-400 text-sm">Next Billing</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {nextBillingDate || 'Jan 15, 2024'}
              </p>
              <p className="text-gray-400 text-sm">automatic</p>
            </div>
          </div>
        </div>

        {/* Billing Management */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Billing Management</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Payment Methods</p>
                  <p className="text-gray-400 text-sm">Manage your credit cards and payment methods</p>
                </div>
              </div>
              <button
                onClick={handleManageBilling}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <span>Manage</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">Billing History</p>
                  <p className="text-gray-400 text-sm">View and download your invoices</p>
                </div>
              </div>
              <button
                onClick={handleManageBilling}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>View History</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Subscription Settings</p>
                  <p className="text-gray-400 text-sm">Cancel, pause, or change your plan</p>
                </div>
              </div>
              <button
                onClick={handleManageBilling}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>Manage Plan</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-400 font-semibold mb-2">Important Information</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• All billing management is handled securely through Stripe</li>
                <li>• Changes take effect at your next billing cycle</li>
                <li>• Cancellations will stop auto-renewal but keep service until period ends</li>
                <li>• You can reactivate your subscription anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
