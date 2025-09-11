'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  MessageSquare, 
  TrendingUp, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  X,
  Loader2,
  Zap
} from 'lucide-react'

interface OnboardingWidgetProps {
  onComplete: () => void
  onDismiss: () => void
}

export default function OnboardingWidget({ onComplete, onDismiss }: OnboardingWidgetProps) {
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
    industry: '',
    
    // Section 2 - Receptionist Setup
    greeting: '',
    businessHours: '',
    customHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: false }
    },
    
    // Section 3 - ROI Setup
    averageJobValue: '',
    closeRate: ''
  })

  const sections = [
    { number: 1, title: 'Business Info', icon: Building2 },
    { number: 2, title: 'AI Setup', icon: MessageSquare },
    { number: 3, title: 'ROI Tracking', icon: TrendingUp }
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
    { value: 'hvac', label: 'HVAC', icon: '❄️' },
    { value: 'painting', label: 'Painting', icon: '🎨' },
    { value: 'roofing', label: 'Roofing', icon: '🏠' }
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCustomHoursChange = (day: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      customHours: {
        ...prev.customHours,
        [day]: { ...prev.customHours[day as keyof typeof prev.customHours], [field]: value }
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
      // Final step - complete onboarding
      await handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onComplete()
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1)
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="Your Name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Industry *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {industryOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('industry', option.value)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      formData.industry === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="font-medium text-slate-900 dark:text-white">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Greeting Message *
              </label>
              <textarea
                value={formData.greeting}
                onChange={(e) => handleInputChange('greeting', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Hello! Thank you for calling [Business Name]. How can I help you today?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Business Hours *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {businessHoursOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      if (option.value === 'custom') {
                        setShowCustomHours(true)
                      } else {
                        setShowCustomHours(false)
                        handleInputChange('businessHours', option.value)
                      }
                    }}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                      formData.businessHours === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <div className="font-medium text-slate-900 dark:text-white">{option.label}</div>
                    {option.popular && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Popular</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Average Job Value *
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={formData.averageJobValue}
                  onChange={(e) => handleInputChange('averageJobValue', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="$2,500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Close Rate (%) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={formData.closeRate}
                  onChange={(e) => handleInputChange('closeRate', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="25"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-6">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Complete Your Setup</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Step {currentSection} of 3</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            {sections.map((section, index) => {
              const Icon = section.icon
              const isActive = currentSection === section.number
              const isCompleted = currentSection > section.number
              
              return (
                <div key={section.number} className="flex items-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  {index < sections.length - 1 && (
                    <div className={`w-8 h-1 mx-2 rounded-full transition-all duration-300 ${
                      currentSection > section.number ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}></div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          {renderSection()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentSection === 1}
            className="flex items-center space-x-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!isSectionValid() || isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Setting up...</span>
              </>
            ) : currentSection === 3 ? (
              <>
                <span>Complete Setup</span>
                <Zap className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

