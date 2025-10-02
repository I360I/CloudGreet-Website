"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  CreditCard, 
  Phone, 
  DollarSign, 
  CheckCircle,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  Clock,
  Star,
  Zap
} from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [businessId, setBusinessId] = useState('')
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    loadBillingInfo()
  }, [])

  const loadBillingInfo = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showError('Please log in to view billing')
        return
      }

      // Load business info to get phone number status
      const response = await fetch('/api/business/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBusinessId(data.data.businessId || '')
          setPhoneNumber(data.data.phone || '')
          setSubscriptionStatus(data.data.subscriptionStatus || 'trial')
        }
      }
    } catch (error) {
      console.error('Failed to load billing info:', error)
    } finally {
      setPageLoading(false)
    }
  }

  const handleUpgradeToPaid = async () => {
    setIsLoading(true)
    try {
      // Redirect to Stripe checkout
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          businessId: businessId,
          plan: 'professional'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          showError('Failed to create checkout session')
        }
      } else {
        showError('Failed to start upgrade process')
      }
    } catch (error) {
      showError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetPhoneNumber = async () => {
    setIsLoading(true)
    try {
      // This would normally integrate with Telnyx to get a phone number
      showSuccess('Phone number assignment will be handled by our team after payment')
      
      // For demo purposes, show a success message
      setTimeout(() => {
        setPhoneNumber('+1 (555) 123-4567')
        setSubscriptionStatus('active')
        showSuccess('Phone number assigned! Your AI agent is now live.')
      }, 2000)
    } catch (error) {
      showError('Failed to assign phone number')
    } finally {
      setIsLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading billing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                <h1 className="text-2xl font-bold">Billing & Phone Setup</h1>
                <p className="text-gray-400">Manage your subscription and get your phone number</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Current Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Current Status</h2>
              <p className="text-gray-400">Your account and service status</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-6 h-6 text-green-400" />
                <h3 className="font-semibold">Subscription</h3>
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
                subscriptionStatus === 'active'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {subscriptionStatus === 'active' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {subscriptionStatus === 'active' ? 'Active' : 'Free Trial'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {subscriptionStatus === 'active' 
                  ? 'Professional plan - $200/month + $50 per booking'
                  : '7-day free trial - No credit card required'
                }
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="w-6 h-6 text-purple-400" />
                <h3 className="font-semibold">Phone Number</h3>
              </div>
              {phoneNumber ? (
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="font-mono text-lg">{phoneNumber}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">Not assigned</span>
                </div>
              )}
              <p className="text-sm text-gray-400">
                {phoneNumber 
                  ? 'Your AI agent is live and answering calls'
                  : 'Complete setup to get your business phone number'
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Phone Number Setup */}
        {!phoneNumber && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-8 mb-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Get Your Phone Number</h2>
                <p className="text-gray-400">Set up your AI receptionist with a dedicated business number</p>
              </div>
            </div>

            <div className="bg-black/20 border border-white/10 rounded-xl p-6 mb-6">
              <h3 className="font-semibold mb-4">What you'll get:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Dedicated toll-free number</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">24/7 AI call answering</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Lead qualification & scheduling</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Call recordings & transcripts</span>
                </div>
              </div>
            </div>

            {subscriptionStatus === 'trial' ? (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-yellow-400 font-medium">Upgrade Required</p>
                      <p className="text-yellow-300 text-sm">You need to upgrade to a paid plan to get your phone number.</p>
                    </div>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpgradeToPaid}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Upgrade to Professional Plan
                    </>
                  )}
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGetPhoneNumber}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Phone className="w-5 h-5" />
                    Get My Phone Number
                  </>
                )}
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Pricing Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Professional Plan</h2>
              <p className="text-gray-400">Everything you need to grow your business</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">$200</div>
              <div className="text-gray-400">per month</div>
              <div className="text-sm text-gray-500 mt-1">Base subscription</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">$50</div>
              <div className="text-gray-400">per booking</div>
              <div className="text-sm text-gray-500 mt-1">Only when we book you</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">$0</div>
              <div className="text-gray-400">setup fees</div>
              <div className="text-sm text-gray-500 mt-1">No hidden costs</div>
            </div>
          </div>

          <div className="bg-black/20 border border-white/10 rounded-xl p-6">
            <h3 className="font-semibold mb-4">What's included:</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                'Dedicated toll-free phone number',
                '24/7 AI call answering',
                'Intelligent lead qualification',
                'Calendar booking integration',
                'SMS confirmations',
                'Call recordings & transcripts',
                'Professional dashboard',
                'Customer support'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>ROI Guarantee:</strong> If our AI doesn't book at least $500 in appointments for you in your first month, we'll refund your subscription fee.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}