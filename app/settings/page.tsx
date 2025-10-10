'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Settings, Phone, MessageSquare, Clock, Brain, User, Building, Globe, MapPin } from 'lucide-react'
import Link from 'next/link'

interface BusinessSettings {
  businessName: string
  businessType: string
  email: string
  phone: string
  website: string
  address: string
  services: string[]
  serviceAreas: string[]
  businessHours: Record<string, string>
  greetingMessage: string
  tone: 'professional' | 'friendly' | 'casual'
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'business' | 'ai' | 'communications'>('business')
  
  const [settings, setSettings] = useState<BusinessSettings>({
    businessName: '',
    businessType: 'HVAC',
    email: '',
    phone: '',
    website: '',
    address: '',
    services: [],
    serviceAreas: [],
    businessHours: {
      monday: '9:00 AM - 5:00 PM',
      tuesday: '9:00 AM - 5:00 PM',
      wednesday: '9:00 AM - 5:00 PM',
      thursday: '9:00 AM - 5:00 PM',
      friday: '9:00 AM - 5:00 PM',
      saturday: 'Closed',
      sunday: 'Closed'
    },
    greetingMessage: '',
    tone: 'professional',
    voice: 'alloy'
  })

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to view settings')
        return
      }

      const response = await fetch('/api/business/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSettings({
            businessName: data.data.businessName || '',
            businessType: data.data.businessType || 'HVAC',
            email: data.data.email || '',
            phone: data.data.phone || '',
            website: data.data.website || '',
            address: data.data.address || '',
            services: data.data.services || [],
            serviceAreas: data.data.serviceAreas || [],
            businessHours: data.data.businessHours || settings.businessHours,
            greetingMessage: data.data.greetingMessage || '',
            tone: data.data.tone || 'professional',
            voice: 'alloy'
          })
        }
      } else {
        setError('Failed to load settings')
      }
    } catch (err) {
      setError('Network error loading settings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to save settings')
        setIsSaving(false)
        return
      }

      // Parse user data to get business ID
      const userData = localStorage.getItem('user')
      if (!userData) {
        setError('User data not found')
        setIsSaving(false)
        return
      }

      const user = JSON.parse(userData)
      const businessId = user.business_id

      if (!businessId) {
        setError('Business ID not found')
        setIsSaving(false)
        return
      }

      // STEP 1: Update business profile
      const businessResponse = await fetch('/api/business/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      if (!businessResponse.ok) {
        const errorData = await businessResponse.json()
        setError(errorData.message || 'Failed to save business settings')
        setIsSaving(false)
        return
      }

      // STEP 2: Update AI agent configuration (THIS IS CRITICAL!)
      const aiUpdateResponse = await fetch('/api/ai-agent/update-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: businessId,
          greetingMessage: settings.greetingMessage,
          tone: settings.tone,
          voice: settings.voice,
          services: settings.services,
          serviceAreas: settings.serviceAreas,
          businessHours: settings.businessHours,
          customInstructions: `Represent ${settings.businessName} professionally. Business type: ${settings.businessType}. Always be helpful and efficient.`
        })
      })

      if (!aiUpdateResponse.ok) {
        const aiError = await aiUpdateResponse.json()
        console.error('AI update failed:', aiError)
        // Don't fail the whole save if AI update fails
        setSuccess('⚠️ Business settings saved, but AI agent update had issues. Your AI may not reflect latest changes until next update.')
      } else {
        setSuccess('✅ All settings saved successfully! Your AI agent is updated and ready.')
      }

      // Reload settings to show updated values
      setTimeout(() => {
        loadSettings()
        setSuccess(null)
      }, 2000)

    } catch (err) {
      console.error('Save error:', err)
      setError('Network error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof BusinessSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addService = () => {
    setSettings(prev => ({
      ...prev,
      services: [...prev.services, '']
    }))
  }

  const removeService = (index: number) => {
    setSettings(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }))
  }

  const updateService = (index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      services: prev.services.map((service, i) => i === index ? value : service)
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-white text-lg">Loading settings...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 text-sm">Configure your business and AI agent</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-4 focus:ring-blue-500/50 focus:outline-none"
                aria-label="Save all settings changes"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
          >
            <p className="text-green-400">{success}</p>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-gray-800/50 rounded-xl p-2 mb-8">
          {[
            { key: 'business', label: 'Business Info', icon: Building },
            { key: 'ai', label: 'AI Agent', icon: Brain },
            { key: 'communications', label: 'Communications', icon: MessageSquare }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-6">Business Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Business Name *</label>
                    <input
                      type="text"
                      value={settings.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="Your Business Name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Business Type</label>
                    <select
                      value={settings.businessType}
                      onChange={(e) => handleInputChange('businessType', e.target.value)}
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
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email *</label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="your@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Website</label>
                    <input
                      type="url"
                      value={settings.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Address *</label>
                    <input
                      type="text"
                      value={settings.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Services Offered</h3>
                  <button
                    onClick={addService}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Add Service
                  </button>
                </div>
                
                <div className="space-y-3">
                  {settings.services.map((service, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={service}
                        onChange={(e) => updateService(index, e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        placeholder="Service name"
                      />
                      <button
                        onClick={() => removeService(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-6">AI Agent Configuration</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Greeting Message *</label>
                    <textarea
                      value={settings.greetingMessage}
                      onChange={(e) => handleInputChange('greetingMessage', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                      placeholder="Hello! Thank you for calling [Business Name]. How can I help you today?"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Tone</label>
                      <select
                        value={settings.tone}
                        onChange={(e) => handleInputChange('tone', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Voice</label>
                      <select
                        value={settings.voice}
                        onChange={(e) => handleInputChange('voice', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="alloy">Alloy (Professional)</option>
                        <option value="echo">Echo (Friendly)</option>
                        <option value="fable">Fable (Warm)</option>
                        <option value="onyx">Onyx (Deep)</option>
                        <option value="nova">Nova (Clear)</option>
                        <option value="shimmer">Shimmer (Bright)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-6">Business Hours</h3>
                
                <div className="space-y-4">
                  {Object.entries(settings.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center space-x-4">
                      <label className="w-24 text-sm font-medium text-gray-400 capitalize">
                        {day}
                      </label>
                      <input
                        type="text"
                        value={hours}
                        onChange={(e) => handleInputChange('businessHours', {
                          ...settings.businessHours,
                          [day]: e.target.value
                        })}
                        className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        placeholder="9:00 AM - 5:00 PM"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communications' && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-6">Communication Settings</h3>
                
                <div className="space-y-6">
                  <div className="bg-gray-800/30 rounded-xl p-4">
                    <h4 className="text-lg font-semibold text-white mb-3">Call Handling</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Answer calls automatically</span>
                        <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Record calls for quality</span>
                        <div className="w-12 h-6 bg-gray-600 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-xl p-4">
                    <h4 className="text-lg font-semibold text-white mb-3">SMS Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Send appointment confirmations</span>
                        <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Send follow-up reminders</span>
                        <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
