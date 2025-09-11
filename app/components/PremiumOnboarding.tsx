'use client'

import { useState } from 'react'
import { 
  CheckCircle, 
  ArrowRight, 
  Phone, 
  Calendar, 
  Building2, 
  User, 
  Clock,
  AlertCircle,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Target,
  Star
} from 'lucide-react'

interface PremiumOnboardingProps {
  onComplete: () => void
  onClose: () => void
}

export default function PremiumOnboarding({ onComplete, onClose }: PremiumOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    phoneNumber: '',
    calendarProvider: '',
    businessHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '10:00', close: '14:00', closed: false },
      sunday: { open: '', close: '', closed: true }
    },
    aiPersonality: 'professional'
  })

  const businessTypes = [
    'HVAC Services',
    'Painting Services', 
    'Roofing Services'
  ]

  const calendarProviders = [
    'Google Calendar',
    'Outlook Calendar',
    'Apple Calendar'
  ]

  const aiPersonalities = [
    { value: 'professional', label: 'Professional & Formal', description: 'Perfect for established businesses' },
    { value: 'friendly', label: 'Friendly & Approachable', description: 'Great for customer service' },
    { value: 'efficient', label: 'Efficient & Direct', description: 'Quick and to the point' }
  ]

  const steps = [
    { number: 1, title: 'Business Info', icon: Building2, completed: currentStep > 1 },
    { number: 2, title: 'Phone Setup', icon: Phone, completed: currentStep > 2 },
    { number: 3, title: 'Calendar', icon: Calendar, completed: currentStep > 3 },
    { number: 4, title: 'AI Personality', icon: User, completed: currentStep > 4 },
    { number: 5, title: 'Complete', icon: CheckCircle, completed: currentStep > 5 }
  ]

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    try {
      // Store onboarding data
      localStorage.setItem('onboardingData', JSON.stringify(formData))
      localStorage.setItem('onboardingComplete', 'true')
      
      // Call completion API
      const response = await fetch('/api/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onComplete()
      } else {
        throw new Error('Failed to complete onboarding')
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.businessName && formData.businessType
      case 2:
        return formData.phoneNumber
      case 3:
        return formData.calendarProvider
      case 4:
        return formData.aiPersonality
      default:
        return true
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tell us about your business</h3>
              <p className="text-slate-600 dark:text-slate-400">This helps us customize your AI receptionist</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Enter your business name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Business Type *
              </label>
              <select
                value={formData.businessType}
                onChange={(e) => handleInputChange('businessType', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select your business type</option>
                {businessTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Set up your phone number</h3>
              <p className="text-slate-600 dark:text-slate-400">We'll assign you a dedicated business number</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="+1 (555) 123-4567"
              />
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                We'll provide you with a dedicated business number for your AI receptionist
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Secure & Reliable</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Your phone number is protected with enterprise-grade security and 99.9% uptime guarantee.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Connect your calendar</h3>
              <p className="text-slate-600 dark:text-slate-400">Let your AI schedule appointments directly</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Calendar Provider *
              </label>
              <select
                value={formData.calendarProvider}
                onChange={(e) => handleInputChange('calendarProvider', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select your calendar</option>
                {calendarProviders.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Zap className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 dark:text-green-100">Automatic Scheduling</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your AI will automatically check availability and book appointments without double-booking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Choose AI personality</h3>
              <p className="text-slate-600 dark:text-slate-400">How should your AI receptionist sound?</p>
            </div>

            <div className="space-y-4">
              {aiPersonalities.map(personality => (
                <div
                  key={personality.value}
                  onClick={() => handleInputChange('aiPersonality', personality.value)}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    formData.aiPersonality === personality.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">{personality.label}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{personality.description}</p>
                    </div>
                    {formData.aiPersonality === personality.value && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">You're all set!</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Your AI receptionist is being configured and will be ready in the next few minutes.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Star className="w-5 h-5 text-yellow-500" />
                <h4 className="font-semibold text-slate-900 dark:text-white">What happens next?</h4>
              </div>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>• Your dedicated phone number will be assigned</p>
                <p>• AI will be trained on your business information</p>
                <p>• Calendar integration will be activated</p>
                <p>• You'll receive a confirmation email with details</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Setup Your AI Receptionist</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Step {currentStep} of 5</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : currentStep === step.number 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {step.completed ? <CheckCircle className="w-4 h-4" /> : step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step.completed ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          
          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <span>{currentStep === 5 ? 'Complete Setup' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

