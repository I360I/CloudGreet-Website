"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, ArrowRight, ArrowLeft, Building,
  Phone, Calendar, Settings, CreditCard,
  Shield, Zap, Star, Clock, MapPin,
  Mail, Globe, Users, Target, X, Gift
} from 'lucide-react'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  // Load initial data from localStorage if available
  const getInitialData = () => {
    if (typeof window !== 'undefined') {
      const businessData = localStorage.getItem('businessData')
      if (businessData) {
        const parsed = JSON.parse(businessData)
        return {
          businessName: parsed.business_name || '',
          businessType: parsed.business_type || 'HVAC', // Already mapped in Hero component
          ownerName: parsed.owner_name || parsed.business_name || '',
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
      ownerName: '',
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
      description: 'Set your availability'
    },
    {
      id: 'ai-config',
      title: 'AI Configuration',
      icon: Zap,
      description: 'Customize your AI receptionist'
    },
    {
      id: 'integrations',
      title: 'Integrations',
      icon: Settings,
      description: 'Connect your tools'
    },
        {
          id: 'billing',
          title: 'Billing Setup',
          icon: CreditCard,
          description: 'Choose your plan'
        },
        {
          id: 'promo',
          title: 'Promo Code',
          icon: Gift,
          description: 'Apply promo code (optional)'
        },
    {
      id: 'review',
      title: 'Review & Launch',
      icon: Star,
      description: 'Final setup and go live'
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
      // Save onboarding data to database
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        onComplete()
        onClose()
      } else {
      }
    } catch (error) {
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
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Your full name"
                />
              </div>
              
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
        
      case 4: // Integrations
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Connect Your Tools</h3>
              <p className="text-gray-400">Integrate with your existing business tools</p>
            </div>
            
            <div className="space-y-4">
              <div className="p-6 bg-gray-700/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Calendar className="w-8 h-8 text-blue-400" />
                    <div>
                      <h4 className="text-white font-semibold">Calendar Integration</h4>
                      <p className="text-gray-400 text-sm">Connect Google Calendar or Outlook</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      // Redirect to Google OAuth
                      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                        `client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&` +
                        `redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_BASE_URL + '/api/calendar/callback')}&` +
                        `scope=https://www.googleapis.com/auth/calendar&` +
                        `response_type=code&` +
                        `access_type=offline&` +
                        `state=${formData.businessName}`
                      
                      window.open(googleAuthUrl, '_blank')
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Connect Google Calendar
                  </motion.button>
                </div>
              </div>
              
              <div className="p-6 bg-gray-700/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Phone className="w-8 h-8 text-green-400" />
                    <div>
                      <h4 className="text-white font-semibold">Phone System</h4>
                      <p className="text-gray-400 text-sm">Set up your business phone number</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Setup
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        )
        
      case 5: // Billing
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Choose Your Plan</h3>
              <p className="text-gray-400">Select the perfect plan for your business</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  name: 'CloudGreet Pro',
                  price: '$200',
                  period: '/month + $50/booking',
                  features: ['Unlimited calls', 'AI receptionist', 'Calendar integration', 'SMS handling', '$50 per booking fee'],
                  recommended: true
                }
              ].map((plan) => (
                <motion.div
                  key={plan.name}
                  whileHover={{ scale: 1.02 }}
                  className={`p-6 rounded-xl border-2 ${
                    plan.recommended
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 bg-gray-700/30'
                  }`}
                >
                  {plan.recommended && (
                    <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                      RECOMMENDED
                    </div>
                  )}
                  <h4 className="text-white font-bold text-xl mb-2">{plan.name}</h4>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      setFormData({...formData, billingPlan: plan.name.toLowerCase()})
                      
                      // Create Stripe customer and subscription
                      try {
                        // First create Stripe customer
                        const customerResponse = await fetch('/api/stripe/create-customer', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            email: formData.email,
                            name: formData.ownerName,
                            phone: formData.phone,
                            address: formData.address
                          })
                        })
                        
                        if (customerResponse.ok) {
                          // Then create subscription
                          const priceId = plan.name.toLowerCase() === 'starter' 
                            ? 'price_starter_monthly' 
                            : 'price_pro_monthly'
                          
                          const subscriptionResponse = await fetch('/api/stripe/create-subscription', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              priceId: priceId
                            })
                          })
                          
                          if (subscriptionResponse.ok) {
                            const subscriptionData = await subscriptionResponse.json()
                            // Redirect to Stripe Checkout if needed
                            if (subscriptionData.data.client_secret) {
                              // Handle payment setup
                              console.log('Payment setup required:', subscriptionData.data.client_secret)
                            }
                          }
                        }
                      } catch (error) {
                        console.error('Billing setup error:', error)
                      }
                    }}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      plan.recommended
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    Choose {plan.name} - $200/month + $50/booking
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
            )

          case 6: // Promo Code
            return (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-white mb-2">Promo Code</h3>
                  <p className="text-gray-400">Have a promo code? Enter it below (optional)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    value={formData.promoCode}
                    onChange={(e) => setFormData({...formData, promoCode: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    placeholder="Enter promo code (optional)"
                  />
                  <p className="text-gray-400 text-sm mt-2">
                    Promo codes can provide special offers or trial periods
                  </p>
                </div>

                <div className="bg-gray-700/30 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <Gift className="w-6 h-6 text-purple-400" />
                    <div>
                      <h4 className="text-white font-medium">Skip This Step</h4>
                      <p className="text-gray-400 text-sm">You can continue without a promo code</p>
                    </div>
                  </div>
                </div>
              </div>
            )

          case 7: // Review
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-white mb-2">Review Your Setup</h3>
              <p className="text-gray-400">Everything looks good? Let's launch your AI receptionist!</p>
            </div>
            
            <div className="bg-gray-700/30 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-4">Business Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Business Name:</span>
                  <span className="text-white ml-2">{formData.businessName}</span>
                </div>
                <div>
                  <span className="text-gray-400">Business Type:</span>
                  <span className="text-white ml-2">{formData.businessType}</span>
                </div>
                <div>
                  <span className="text-gray-400">Owner:</span>
                  <span className="text-white ml-2">{formData.ownerName}</span>
                </div>
                <div>
                  <span className="text-gray-400">Phone:</span>
                  <span className="text-white ml-2">{formData.phone}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700/30 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <div className="flex flex-wrap gap-2">
                {formData.services.map((service, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm">
                    {service}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-700/30 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-4">AI Configuration</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Tone:</span>
                  <span className="text-white ml-2 capitalize">{formData.tone}</span>
                </div>
                <div>
                  <span className="text-gray-400">Greeting:</span>
                  <span className="text-white ml-2">{formData.greetingMessage}</span>
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
          className="bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 w-full max-w-4xl max-h-[90vh] overflow-hidden"
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
                      index <= currentStep ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      {index < currentStep ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 rounded ${
                        index < currentStep ? 'bg-blue-600' : 'bg-gray-600'
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
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {renderStep()}
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
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <span>{currentStep === steps.length - 1 ? 'Launch AI Receptionist' : 'Next'}</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

