'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, ArrowRight, ArrowLeft, Building,
  Phone, Settings, Star, X, AlertCircle, Play
} from 'lucide-react'

interface SimpleOnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function SimpleOnboardingWizard({ isOpen, onClose, onComplete }: SimpleOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'HVAC',
    email: '',
    phone: '',
    greetingMessage: '',
    tone: 'professional'
  })

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to CloudGreet!',
      description: 'Let\'s get your AI receptionist set up in just 2 minutes'
    },
    {
      id: 'business',
      title: 'Tell us about your business',
      description: 'Basic information to personalize your AI'
    },
    {
      id: 'test',
      title: 'Test your AI agent',
      description: 'See how your AI will handle customer calls'
    },
    {
      id: 'complete',
      title: 'You\'re all set!',
      description: 'Your AI receptionist is ready to take calls'
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      // Call the real onboarding completion API
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessName: formData.businessName,
          businessType: formData.businessType === 'HVAC' ? 'HVAC' : 
                       formData.businessType === 'Painting' ? 'Paint' : 'Roofing',
          email: formData.email,
          phone: formData.phone,
          website: '',
          address: '',
          services: formData.businessType === 'HVAC' ? ['HVAC Repair', 'HVAC Installation', 'HVAC Maintenance'] :
                   formData.businessType === 'Painting' ? ['Interior Painting', 'Exterior Painting', 'Commercial Painting'] :
                   ['Roofing Installation', 'Roof Repair', 'Roof Maintenance'],
          serviceAreas: ['Local Area'],
          businessHours: {
            monday: '9 AM - 5 PM',
            tuesday: '9 AM - 5 PM', 
            wednesday: '9 AM - 5 PM',
            thursday: '9 AM - 5 PM',
            friday: '9 AM - 5 PM',
            saturday: 'closed',
            sunday: 'closed'
          },
          greetingMessage: formData.greetingMessage || `Hello! Thank you for calling ${formData.businessName}. How can I help you today?`,
          tone: formData.tone,
          billingPlan: 'pro',
          promoCode: ''
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Setup failed. Please try again.')
      }

      if (!result.success) {
        throw new Error(result.message || 'Setup failed. Please try again.')
      }

      // Store the data locally for immediate use
      localStorage.setItem('demoBusinessData', JSON.stringify(formData))
      localStorage.setItem('businessId', result.businessId || '')
      localStorage.setItem('agentId', result.agentId || '')
      
      // Complete onboarding
      onComplete()
      onClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestDemo = () => {
    // Redirect to the real voice demo page
    window.open('/demo', '_blank')
  }

  // Removed 180 lines of fake demo simulation code that simulated conversations with hardcoded messages

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 w-full max-w-2xl max-h-[95vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Quick Setup</h2>
                <p className="text-gray-400 text-sm">Step {currentStep + 1} of {steps.length}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-3">
            <div className="w-full bg-gray-700/50 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto scrollbar-hide">
            {currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-blue-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Building className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Welcome to CloudGreet!</h3>
                <p className="text-gray-400 mb-8">
                  Your AI receptionist is ready to handle calls 24/7. Let&apos;s personalize it for your business in just 2 minutes.
                </p>
                <div className="space-y-4 text-left">
                  <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <h4 className="text-white font-medium">Answer calls automatically</h4>
                      <p className="text-gray-400 text-sm">Never miss another customer call</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <h4 className="text-white font-medium">Qualify leads intelligently</h4>
                      <p className="text-gray-400 text-sm">Get detailed customer information</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <h4 className="text-white font-medium">Schedule appointments</h4>
                      <p className="text-gray-400 text-sm">Book directly to your calendar</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Business Information</h3>
                  <p className="text-gray-400">Tell us about your business</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Business Name</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="ABC Heating & Cooling"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Business Type</label>
                    <select
                      value={formData.businessType}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="HVAC">HVAC</option>
                      <option value="Paint">Painting</option>
                      <option value="Roofing">Roofing</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Landscaping">Landscaping</option>
                      <option value="General">General Services</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="owner@yourbusiness.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="(833) 395-6731"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Greeting Message</label>
                    <textarea
                      value={formData.greetingMessage}
                      onChange={(e) => setFormData(prev => ({ ...prev, greetingMessage: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="Hello! Thank you for calling [Business Name]. How can I help you today?"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Play className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Test Your AI Agent</h3>
                <p className="text-gray-400 mb-8">
                  See how your AI will handle a real customer call. This is a simulation - no phone number needed!
                </p>
                
                <div className="bg-white/5 rounded-xl p-6 mb-6">
                  <h4 className="text-white font-medium mb-2">Your AI Configuration:</h4>
                  <div className="text-left space-y-2 text-sm text-gray-300">
                    <p><strong>Business:</strong> {formData.businessName || 'Your Business'}</p>
                    <p><strong>Type:</strong> {formData.businessType}</p>
                    <p><strong>Greeting:</strong> {formData.greetingMessage || 'Default greeting'}</p>
                    <p><strong>Tone:</strong> {formData.tone}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleTestDemo}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-3"
                >
                  <Play className="w-5 h-5" />
                  <span>Start Demo Call</span>
                </button>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">You&apos;re All Set!</h3>
                <p className="text-gray-400 mb-8">
                  Your AI receptionist is configured and ready to handle calls. You can always update these settings later.
                </p>
                
                <div className="bg-white/5 rounded-xl p-6 mb-6">
                  <h4 className="text-white font-medium mb-4">Next Steps:</h4>
                  <div className="space-y-3 text-left text-sm text-gray-300">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Test your AI agent anytime in the dashboard</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Customize your greeting and settings</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Set up your phone number when ready</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Start receiving qualified leads!</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10">
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && (!formData.businessName || !formData.email))
                  }
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Setting up...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete Setup</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
