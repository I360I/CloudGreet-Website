"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle, Building, Phone } from 'lucide-react'
import { buildRegistrationPayload, type RegistrationFormData } from '@/lib/auth/register-payload'
import { PLACEHOLDERS } from '@/lib/constants'
import { setAuthToken } from '@/lib/auth/token-manager'

type StartFormState = RegistrationFormData & {
  confirmPassword: string
  website: string
}

const DEFAULT_FORM: StartFormState = {
  firstName: '',
  lastName: '',
  businessName: '',
  businessType: 'HVAC',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  address: '',
  website: ''
}

export default function StartPage() {
  const [formData, setFormData] = useState<StartFormState>(DEFAULT_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleInputChange = (field: keyof StartFormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    setError('')
    setSuccess(false)
    
    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        setIsSubmitting(false)
        return
      }
      
      // Validate password strength
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long')
        setIsSubmitting(false)
        return
      }
      
      const payload = buildRegistrationPayload(formData)

      // Create account using unified API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          website: formData.website
        }),
      })

      const result = await response.json()

      if (!response.ok || !result?.success) {
        const message =
          result?.message ||
          result?.error?.message ||
          'Account creation failed. Please try again.'
        throw new Error(message)
      }

      // Store token securely in httpOnly cookie
      await setAuthToken(result.data.token)
      
      // User/business data will be fetched from API when needed
      // No need to store in localStorage - API provides fresh data

      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
    } catch (error) {
      // Enhanced error handling with specific user-friendly messages
      let errorMessage = 'Account creation failed. Please try again.'
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase()
        
        if (message.includes('email') && message.includes('already')) {
          errorMessage = 'An account with this email already exists. Please use a different email or try logging in.'
        } else if (message.includes('password') && message.includes('weak')) {
          errorMessage = 'Password is too weak. Please use at least 8 characters with numbers and letters.'
        } else if (message.includes('validation')) {
          errorMessage = 'Please check all fields are filled correctly.'
        } else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (message.includes('business') && message.includes('creation')) {
          errorMessage = 'Error creating business profile. Please try again or contact support.'
        } else {
          errorMessage = error.message || errorMessage
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const businessTypes = [
    { value: 'HVAC', label: 'HVAC Services' },
    { value: 'Painting', label: 'Painting Services' },
    { value: 'Roofing', label: 'Roofing Contractor' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">
                CloudGreet
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Step {step} of 2
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-block bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2 mb-6">
            <span className="text-green-400 text-sm font-medium">✨ Professional AI Receptionist Service</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Let&apos;s Get Started
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Get started and see how your AI receptionist can help your business
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="bg-gray-800/50 backdrop-blur-lg rounded-3xl border border-gray-700/50 p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Business Information */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Building className="w-6 h-6 text-blue-400" />
                Business Information
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-300 font-medium mb-3">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={PLACEHOLDERS.FIRST_NAME}
                    autoComplete="given-name"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-3">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder={PLACEHOLDERS.LAST_NAME}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 font-medium mb-3">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="ABC Services LLC"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-3">
                    Business Type *
                  </label>
                  <select
                    required
                    value={formData.businessType}
                    onChange={(e) =>
                      handleInputChange('businessType', e.target.value as StartFormState['businessType'])
                    }
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select your business type</option>
                    {businessTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-3">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="https://yourbusiness.com"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Phone className="w-6 h-6 text-green-400" />
                Contact Information
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 font-medium mb-3">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="owner@business.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-3">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Minimum 8 characters"
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-3">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Confirm your password"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-3">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="(833) 395-6731"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-300 font-medium mb-3">
                    Business Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">What&apos;s Next?</h3>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Set up your AI receptionist with your business details</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Configure your services, pricing, and availability</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Connect your calendar and phone number</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Launch and start capturing every call</span>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0"
                  />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-500/10 border border-green-500/40 rounded-xl p-5 text-green-300 text-sm mb-6 flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Account created successfully! Redirecting to your dashboard...</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="text-center pt-4">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      className="rounded-full h-5 w-5 border-b-2 border-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <motion.div
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </>
                )}
                {!isSubmitting && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
                    whileHover={{ opacity: 0.1, x: [-100, 100] }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

