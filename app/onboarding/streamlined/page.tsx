'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  DollarSign,
  TrendingUp,
  CreditCard,
  Shield,
  Zap,
  Loader2,
  ChevronDown,
  Star,
  Sparkles,
  X
} from 'lucide-react'

export default function StreamlinedOnboarding() {
  const router = useRouter()
  const [currentSection, setCurrentSection] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showCustomHours, setShowCustomHours] = useState(false)
  const [formData, setFormData] = useState({
    // Section 1 - Business Basics
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    industry: 'hvac',
    
    // Section 2 - Receptionist Setup
    greeting: 'Thanks for calling {businessName}, how can we help you today?',
    businessHours: 'Mon-Fri 7-5',
    customHours: {
      monday: { open: '07:00', close: '17:00', closed: false },
      tuesday: { open: '07:00', close: '17:00', closed: false },
      wednesday: { open: '07:00', close: '17:00', closed: false },
      thursday: { open: '07:00', close: '17:00', closed: false },
      friday: { open: '07:00', close: '17:00', closed: false },
      saturday: { open: '08:00', close: '16:00', closed: false },
      sunday: { open: '', close: '', closed: true }
    },
    
    // Section 3 - ROI Setup
    averageJobValue: '',
    closeRate: '35',
    
    // Section 4 - Payment
    paymentMethod: 'card'
  })

  const sections = [
    { number: 1, title: 'Business Info', icon: Building2, description: 'Tell us about your business' },
    { number: 2, title: 'AI Setup', icon: MessageSquare, description: 'Configure your receptionist' },
    { number: 3, title: 'ROI Tracking', icon: TrendingUp, description: 'Set up analytics' }
  ]

  const businessHoursOptions = [
    { value: 'Mon-Fri 7-5', label: 'Monday - Friday, 7 AM - 5 PM', popular: true },
    { value: 'Mon-Fri 8-6', label: 'Monday - Friday, 8 AM - 6 PM', popular: true },
    { value: 'Mon-Sat 7-5', label: 'Monday - Saturday, 7 AM - 5 PM', popular: false },
    { value: 'Mon-Fri 6-8', label: 'Monday - Friday, 6 AM - 8 PM', popular: false },
    { value: '24/7', label: '24/7 (Emergency Services)', popular: false },
    { value: 'custom', label: 'Custom Hours', popular: false }
  ]

  const industryOptions = [
    { value: 'hvac', label: 'HVAC Services', icon: '❄️', popular: true },
    { value: 'painting', label: 'Painting Services', icon: '🎨', popular: true },
    { value: 'roofing', label: 'Roofing Services', icon: '🏠', popular: true }
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCustomHoursChange = (day: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      customHours: {
        ...prev.customHours,
        [day]: {
          ...prev.customHours[day],
          [field]: value
        }
      }
    }))
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10
  }

  const handleNext = async () => {
    if (currentSection < 3) {
      setCurrentSection(currentSection + 1)
    } else {
      // Final step - redirect to dashboard
      handleSubmit()
    }
  }


  const handleBack = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      // Call the onboarding completion API
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }
      
      const result = await response.json()
      console.log('Onboarding completed:', result)
      
      // Store onboarding data
      localStorage.setItem('onboardingData', JSON.stringify(formData))
      localStorage.setItem('onboardingComplete', 'true')
      localStorage.setItem('businessRecord', JSON.stringify(result.data.businessRecord))
      
      // Redirect to dashboard for testing and configuration
      router.push('/dashboard?setup=true')
    } catch (error) {
      console.error('Error during onboarding:', error)
      alert('There was an error completing your setup. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isSectionValid = () => {
    switch (currentSection) {
      case 1:
        return formData.businessName && formData.ownerName && validateEmail(formData.email) && validatePhone(formData.phone) && formData.industry
      case 2:
        return formData.greeting && formData.businessHours
      case 3:
        return formData.averageJobValue && formData.closeRate
      default:
        return false
    }
  }

  const renderSection = () => {
    switch (currentSection) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Business Information</h3>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Let's get your business set up so we can personalize your AI receptionist
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  className="w-full px-4 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg transition-all duration-200"
                  placeholder="e.g., Austin Painters"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Industry Type *
                </label>
                <div className="space-y-3">
                  {industryOptions.map((option) => (
                    <label key={option.value} className="flex items-center p-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 group">
                      <input
                        type="radio"
                        name="industry"
                        value={option.value}
                        checked={formData.industry === option.value}
                        onChange={(e) => handleInputChange('industry', e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 mr-3 transition-all duration-200 ${
                        formData.industry === option.value 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-400'
                      }`}>
                        {formData.industry === option.value && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{option.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-900 dark:text-white font-medium text-sm">{option.label}</span>
                            {option.popular && (
                              <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-semibold px-2 py-1 rounded-full">
                                Popular
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Owner's Name *
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  className="w-full px-4 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg transition-all duration-200"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Business Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-4 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg transition-all duration-200 ${
                    formData.email && !validateEmail(formData.email) 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
                      : formData.email && validateEmail(formData.email)
                      ? 'border-green-300 dark:border-green-600 focus:border-green-500'
                      : 'border-slate-200 dark:border-slate-600 focus:border-blue-500'
                  }`}
                  placeholder="your@business.com"
                />
                {formData.email && !validateEmail(formData.email) && (
                  <p className="text-sm text-red-500 dark:text-red-400">Please enter a valid email address</p>
                )}
                {formData.email && validateEmail(formData.email) && (
                  <p className="text-sm text-green-500 dark:text-green-400">✓ Valid email address</p>
                )}
                {!formData.email && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">For notifications and billing</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Business Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-4 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg transition-all duration-200 ${
                    formData.phone && !validatePhone(formData.phone) 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
                      : formData.phone && validatePhone(formData.phone)
                      ? 'border-green-300 dark:border-green-600 focus:border-green-500'
                      : 'border-slate-200 dark:border-slate-600 focus:border-blue-500'
                  }`}
                  placeholder="(555) 123-4567"
                />
                {formData.phone && !validatePhone(formData.phone) && (
                  <p className="text-sm text-red-500 dark:text-red-400">Please enter a valid phone number (10+ digits)</p>
                )}
                {formData.phone && validatePhone(formData.phone) && (
                  <p className="text-sm text-green-500 dark:text-green-400">✓ Valid phone number</p>
                )}
                {!formData.phone && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">For urgent calls and notifications</p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">AI Receptionist Setup</h3>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Configure how your AI receptionist will answer calls and represent your business
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Greeting Message *
                </label>
                <textarea
                  value={formData.greeting}
                  onChange={(e) => handleInputChange('greeting', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg transition-all duration-200 resize-none"
                  placeholder="Thanks for calling {businessName}, how can we help you today?"
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Use <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{"{businessName}"}</code> to automatically insert your business name
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Business Hours *
                </label>
                <div className="space-y-3">
                  {businessHoursOptions.map((option) => (
                    <label key={option.value} className="flex items-center p-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 group">
                      <input
                        type="radio"
                        name="businessHours"
                        value={option.value}
                        checked={formData.businessHours === option.value}
                        onChange={(e) => {
                          handleInputChange('businessHours', e.target.value)
                          if (e.target.value === 'custom') {
                            setShowCustomHours(true)
                          } else {
                            setShowCustomHours(false)
                          }
                        }}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 mr-4 transition-all duration-200 ${
                        formData.businessHours === option.value 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-400'
                      }`}>
                        {formData.businessHours === option.value && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-900 dark:text-white font-medium">{option.label}</span>
                          {option.popular && (
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-semibold px-2 py-1 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Custom Hours Section */}
                {showCustomHours && (
                  <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-blue-200 dark:border-blue-800">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Set Custom Hours</h4>
                    <div className="space-y-4">
                      {Object.entries(formData.customHours).map(([day, hours]) => (
                        <div key={day} className="flex items-center space-x-4">
                          <div className="w-20 text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {day}
                          </div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={!hours.closed}
                              onChange={(e) => handleCustomHoursChange(day, 'closed', !e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-2 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-400">Open</span>
                          </label>
                          {!hours.closed && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="time"
                                value={hours.open}
                                onChange={(e) => handleCustomHoursChange(day, 'open', e.target.value)}
                                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                              />
                              <span className="text-slate-500">to</span>
                              <input
                                type="time"
                                value={hours.close}
                                onChange={(e) => handleCustomHoursChange(day, 'close', e.target.value)}
                                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">ROI & Analytics Setup</h3>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Help us track your return on investment and provide detailed analytics
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Average Job Value *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    step="50"
                    value={formData.averageJobValue}
                    onChange={(e) => handleInputChange('averageJobValue', e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg transition-all duration-200"
                    placeholder="1500"
                  />
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">💡 Typical ranges by industry:</p>
                  <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <div>• HVAC: $200 - $2,500</div>
                    <div>• Painting: $500 - $5,000</div>
                    <div>• Roofing: $1,000 - $15,000</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Close Rate (Optional)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="95"
                    step="5"
                    value={formData.closeRate}
                    onChange={(e) => handleInputChange('closeRate', e.target.value)}
                    className="w-full px-4 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-lg transition-all duration-200"
                    placeholder="35"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400">
                    %
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-2">📊 Close Rate Guidelines:</p>
                  <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
                    <div>• 20-30%: Good for new businesses</div>
                    <div>• 30-40%: Industry average</div>
                    <div>• 40-50%: Excellent performance</div>
                    <div>• 50%+: Outstanding (rare)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CloudGreet Setup</h1>
                <p className="text-slate-500 dark:text-slate-400">Get your AI receptionist live in minutes</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Step {currentSection} of 3
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Exit Setup</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-4xl mx-auto px-6">
          {/* Completion Percentage */}
          <div className="pt-6 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Setup Progress</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {Math.round(((currentSection - 1) / 3) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentSection - 1) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-6">
            {sections.map((section, index) => {
              const Icon = section.icon
              const isActive = currentSection === section.number
              const isCompleted = currentSection > section.number
              
              return (
                <div key={section.number} className="flex items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : isActive 
                        ? 'bg-blue-500 text-white shadow-lg scale-110' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <div className="ml-4">
                    <div className={`text-sm font-bold ${
                      isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {section.title}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {section.description}
                    </div>
                  </div>
                  {index < sections.length - 1 && (
                    <div className={`w-20 h-1 mx-6 rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 p-10">
          {renderSection()}


          {/* Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleBack}
              disabled={currentSection === 1}
              className="flex items-center space-x-2 px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            
            <button
              onClick={handleNext}
              disabled={!isSectionValid() || isLoading}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : currentSection === 3 ? (
                <>
                  <span>Go to Dashboard</span>
                  <Zap className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}