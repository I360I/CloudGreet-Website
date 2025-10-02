"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, ArrowRight, ArrowLeft, Building,
  Phone, Calendar, Settings, CreditCard,
  Shield, Zap, Star, Clock, MapPin,
  Mail, Globe, Users, Target, X, Gift, AlertCircle
} from 'lucide-react'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load initial data from localStorage if available
  const getInitialData = () => {
    if (typeof window !== 'undefined') {
      const businessData = localStorage.getItem('businessData')
      if (businessData) {
        const parsed = JSON.parse(businessData)
        return {
          businessName: parsed.business_name || '',
          businessType: parsed.business_type || 'HVAC', // Already mapped in Hero component
          email: parsed.email || '',
          phone: parsed.phone || '',
          website: parsed.website || '',
          address: parsed.address || '',
        }
      }
    }
    return {
      businessName: '',
      businessType: 'HVAC',
      email: '',
      phone: '',
      website: '',
      address: '',
    }
  }
  
  const [formData, setFormData] = useState({
    // Business Basics
    ...getInitialData(),
    
    // Services
    services: [] as string[],
    serviceAreas: [] as string[],
    
    // Hours & Availability
    businessHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '10:00', close: '15:00', closed: false },
      sunday: { open: '', close: '', closed: true }
    },
    
    // AI Configuration
    greetingMessage: '',
    tone: 'professional',
    specialties: [] as string[],
    
    // Calendar Integration
    calendarProvider: 'google',
    calendarConnected: false,
    
    // Phone Setup
    phoneProvider: 'telynyx',
    phoneConnected: false,
    afterHoursPolicy: 'voicemail',
    
    // Billing
    billingPlan: 'pro',
    paymentMethod: 'card',
    promoCode: ''
  })

  const steps = [
    {
      id: 'business',
      title: 'Business Information',
      icon: Building,
      description: 'Review and confirm your business details'
    },
    {
      id: 'services',
      title: 'Services & Areas',
      icon: Target,
      description: 'Define your services and coverage'
    },
    {
      id: 'hours',
      title: 'Business Hours',
      icon: Clock,
      description: 'Set your availability and after-hours policy'
    },
    {
      id: 'ai-config',
      title: 'AI Configuration',
      icon: Zap,
      description: 'Customize your AI receptionist'
    },
    {
      id: 'integrations',
      title: 'Review & Confirm',
      icon: CheckCircle,
      description: 'Review your setup and launch your AI receptionist'
    }
  ]

  const businessTypes = [
    { value: 'HVAC', label: 'HVAC Services', icon: '🌡️' },
    { value: 'Painting', label: 'Painting Services', icon: '🎨' },
    { value: 'Roofing', label: 'Roofing Services', icon: '🏠' }
  ]

  const serviceOptions = {
    HVAC: ['AC Repair', 'Heating Repair', 'Maintenance', 'Installation', 'Emergency Service'],
    Painting: ['Interior Painting', 'Exterior Painting', 'Commercial Painting', 'Pressure Washing', 'Color Consultation'],
    Roofing: ['Roof Repair', 'Roof Replacement', 'Gutter Services', 'Siding', 'Emergency Repair']
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Validate required fields
      if (!formData.businessName || !formData.email || !formData.phone) {
        setError('Please fill in all required fields')
        setIsLoading(false)
        return
      }

      // Add default values for missing required fields
      const completeFormData = {
        ...formData,
        businessType: formData.businessType === 'Painting' ? 'Paint' : (formData.businessType || 'General'),
        services: formData.services && formData.services.length > 0 ? formData.services : ['General Services'],
        serviceAreas: formData.serviceAreas && formData.serviceAreas.length > 0 ? formData.serviceAreas : ['Local Area'],
        greetingMessage: formData.greetingMessage || `Hello! Thank you for calling ${formData.businessName}. How can I help you today?`,
        tone: formData.tone || 'professional',
        address: formData.address || 'Address not provided',
        website: formData.website || '',
        businessHours: formData.businessHours || {
          monday: '9:00 AM - 5:00 PM',
          tuesday: '9:00 AM - 5:00 PM', 
          wednesday: '9:00 AM - 5:00 PM',
          thursday: '9:00 AM - 5:00 PM',
          friday: '9:00 AM - 5:00 PM',
          saturday: 'Closed',
          sunday: 'Closed'
        }
      }

      // Get authentication token
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to complete setup')
        setIsLoading(false)
        return
      }

      // Save onboarding data to database
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(completeFormData)
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Verify the result actually contains success data
        if (result.success && result.businessId) {
          // Close onboarding and refresh dashboard
          onComplete()
          onClose()
          
          // Refresh the page to show updated dashboard
          window.location.reload()
        } else {
          setError('Onboarding completed but verification failed. Please check your dashboard.')
        }
      } else {
        const errorData = await response.json()
        console.error('Onboarding failed:', errorData)
        console.error('Response status:', response.status)
        console.error('Full error data:', errorData)
        setError(errorData.error || errorData.message || 'Failed to complete setup. Please try again.')
      }
    } catch (error) {
      console.error('Onboarding error:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Business Information
        return (
          <div className="space-y-6">
            {/* Pre-filled information notice */}
            {formData.businessName && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-blue-300 font-medium">Information Pre-filled</p>
                    <p className="text-gray-400 text-sm">We've filled in your business details from your signup. You can edit any field below.</p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your business name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {businessTypes.map((type) => (
                  <motion.button
                    key={type.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({...formData, businessType: type.value})}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.businessType === type.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="text-white font-medium">{type.label}</div>
                  </motion.button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="your@business.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="123 Main St, City, State 12345"
                rows={3}
              />
            </div>
          </div>
        )
        
      case 1: // Services
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4">
                Select Your Services *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {serviceOptions[formData.businessType as keyof typeof serviceOptions]?.map((service) => (
                  <motion.label
                    key={service}
                    whileHover={{ scale: 1.02 }}
                    className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.services.includes(service)
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.services.includes(service)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            services: [...formData.services, service]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            services: formData.services.filter(s => s !== service)
                          })
                        }
                      }}
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-white font-medium">{service}</span>
                  </motion.label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Service Areas (Cities/ZIP codes you serve)
              </label>
              <textarea
                value={formData.serviceAreas.join(', ')}
                onChange={(e) => setFormData({
                  ...formData,
                  serviceAreas: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="City 1, City 2, ZIP 12345, etc."
                rows={3}
              />
            </div>
          </div>
        )
        
      case 2: // Business Hours
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Business Hours</h3>
              <p className="text-gray-400">Set your availability for appointments</p>
            </div>
            
            <div className="space-y-4">
              {Object.entries(formData.businessHours).map(([day, hours]) => (
                <div key={day} className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-xl">
                  <div className="w-24">
                    <span className="text-white font-medium capitalize">{day}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!hours.closed}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessHours: {
                          ...formData.businessHours,
                          [day]: {
                            ...hours,
                            closed: !e.target.checked
                          }
                        }
                      })}
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-300">Open</span>
                  </div>
                  
                  {!hours.closed && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) => setFormData({
                          ...formData,
                          businessHours: {
                            ...formData.businessHours,
                            [day]: { ...hours, open: e.target.value }
                          }
                        })}
                        className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) => setFormData({
                          ...formData,
                          businessHours: {
                            ...formData.businessHours,
                            [day]: { ...hours, close: e.target.value }
                          }
                        })}
                        className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
        
      case 3: // AI Configuration
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Greeting Message *
              </label>
              <textarea
                value={formData.greetingMessage}
                onChange={(e) => setFormData({...formData, greetingMessage: e.target.value})}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Hello! Thank you for calling [Business Name]. How can I help you today?"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                AI Tone *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'professional', label: 'Professional', description: 'Formal and business-like' },
                  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
                  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' }
                ].map((tone) => (
                  <motion.button
                    key={tone.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({...formData, tone: tone.value})}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.tone === tone.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-white font-medium mb-1">{tone.label}</div>
                    <div className="text-gray-400 text-sm">{tone.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )
        
      case 4: // Review & Confirm
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Review Your Setup</h3>
              <p className="text-gray-400">Everything looks good? Let's get your AI receptionist ready!</p>
            </div>
            
            <div className="space-y-4">
              <div className="p-6 bg-gray-700/30 rounded-xl">
                <div className="flex items-center space-x-4 mb-4">
                  <Building className="w-6 h-6 text-blue-400" />
                  <h4 className="text-white font-semibold">Business Information</h4>
                </div>
                <div className="space-y-2 text-gray-300">
                  <p><span className="text-gray-400">Name:</span> {formData.businessName}</p>
                  <p><span className="text-gray-400">Type:</span> {formData.businessType}</p>
                  <p><span className="text-gray-400">Phone:</span> {formData.phone}</p>
                  <p><span className="text-gray-400">Address:</span> {formData.address}</p>
                </div>
              </div>

              <div className="p-6 bg-gray-700/30 rounded-xl">
                <div className="flex items-center space-x-4 mb-4">
                  <Target className="w-6 h-6 text-green-400" />
                  <h4 className="text-white font-semibold">Services & Coverage</h4>
                </div>
                <div className="space-y-2 text-gray-300">
                  <p><span className="text-gray-400">Services:</span> {formData.services?.join(', ') || 'Not specified'}</p>
                  <p><span className="text-gray-400">Service Areas:</span> {formData.serviceAreas?.join(', ') || 'Not specified'}</p>
                </div>
              </div>

              <div className="p-6 bg-gray-700/30 rounded-xl">
                <div className="flex items-center space-x-4 mb-4">
                  <Clock className="w-6 h-6 text-purple-400" />
                  <h4 className="text-white font-semibold">Business Hours</h4>
                </div>
                <div className="space-y-2 text-gray-300">
                  {Object.entries(formData.businessHours || {}).map(([day, hours]: [string, any]) => (
                    <p key={day}>
                      <span className="text-gray-400 capitalize">{day}:</span> {
                        hours?.closed ? 'Closed' : 
                        hours?.open && hours?.close ? `${hours.open} - ${hours.close}` : 
                        'Not set'
                      }
                    </p>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-gray-700/30 rounded-xl">
                <div className="flex items-center space-x-4 mb-4">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <h4 className="text-white font-semibold">AI Configuration</h4>
                </div>
                <div className="space-y-2 text-gray-300">
                  <p><span className="text-gray-400">Tone:</span> {formData.tone}</p>
                  <p><span className="text-gray-400">Greeting:</span> {formData.greetingMessage || 'Default greeting will be used'}</p>
                </div>
              </div>

              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center space-x-4 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h4 className="text-green-400 font-semibold">Ready to Launch!</h4>
                </div>
                <div className="space-y-2 text-gray-300">
                  <p>✅ Your AI receptionist is configured and ready</p>
                  <p>✅ Business hours and policies are set</p>
                  <p>✅ Services and coverage areas defined</p>
                  <p>✅ Professional greeting and tone configured</p>
                </div>
                <div className="mt-4 p-3 bg-green-500/20 rounded-lg">
                  <p className="text-green-400 text-sm font-medium">
                    🚀 After billing setup, your AI will start handling calls immediately!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
        


        
      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 w-full max-w-4xl max-h-[95vh] flex flex-col"
        >
          {/* Header */}
          <div className="border-b border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {steps[currentStep].title}
                </h2>
                <p className="text-gray-400">{steps[currentStep].description}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <X className="w-6 h-6 text-gray-300" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-2">
                {steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index <= currentStep ? 'bg-white/20 backdrop-blur-sm border border-white/30' : 'bg-gray-600/50'
                    }`}>
                      {index < currentStep ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 rounded ${
                        index < currentStep ? 'bg-white/30' : 'bg-gray-600/50'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto scrollbar-hide">
            {renderStep()}
            
            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-red-400 font-semibold">Setup Error</h4>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-700/50 text-white rounded-lg font-medium hover:bg-gray-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Previous</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.05 }}
                whileTap={{ scale: isLoading ? 1 : 0.95 }}
                onClick={handleNext}
                disabled={isLoading}
                className="flex items-center space-x-2 px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Setting up...</span>
                  </>
                ) : (
                  <>
                    <span>{currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}


