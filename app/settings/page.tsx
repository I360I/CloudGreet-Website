'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Settings,
  Save,
  Phone,
  Calendar,
  User,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Moon,
  Sun,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  Mail,
  Building2,
  Clock,
  Zap,
  Target
} from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    business: {
      name: '',
      type: '',
      phone: '',
      email: '',
      address: '',
      website: ''
    },
    ai: {
      personality: 'professional',
      greeting: '',
      businessHours: {
        monday: { open: '09:00', close: '17:00', closed: false },
        tuesday: { open: '09:00', close: '17:00', closed: false },
        wednesday: { open: '09:00', close: '17:00', closed: false },
        thursday: { open: '09:00', close: '17:00', closed: false },
        friday: { open: '09:00', close: '17:00', closed: false },
        saturday: { open: '10:00', close: '14:00', closed: false },
        sunday: { open: '', close: '', closed: true }
      },
      emergencyHandling: true,
      spamFilter: true
    },
    notifications: {
      email: true,
      sms: false,
      dailyDigest: true,
      instantAlerts: true,
      weeklyReport: true
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
      apiAccess: false
    },
    billing: {
      plan: 'pro',
      nextBilling: '',
      paymentMethod: 'card'
    }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    // Load from localStorage or API
    const storedOnboardingData = localStorage.getItem('onboardingData')
    if (storedOnboardingData) {
      const data = JSON.parse(storedOnboardingData)
      setSettings(prev => ({
        ...prev,
        business: {
          ...prev.business,
          name: data.businessName || '',
          type: data.businessType || '',
          phone: data.phoneNumber || ''
        },
        ai: {
          ...prev.ai,
          personality: data.aiPersonality || 'professional',
          businessHours: data.businessHours || prev.ai.businessHours
        }
      }))
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Save settings to API
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        // Show success message
        console.log('Settings saved successfully')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (section: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }))
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'ai', label: 'AI Settings', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={settings.business.name}
                    onChange={(e) => handleInputChange('business', 'name', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Business Type
                  </label>
                  <select
                    value={settings.business.type}
                    onChange={(e) => handleInputChange('business', 'type', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="HVAC Services">HVAC Services</option>
                    <option value="Painting Services">Painting Services</option>
                    <option value="Roofing Services">Roofing Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={settings.business.phone}
                    onChange={(e) => handleInputChange('business', 'phone', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.business.email}
                    onChange={(e) => handleInputChange('business', 'email', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Business Address
                  </label>
                  <input
                    type="text"
                    value={settings.business.address}
                    onChange={(e) => handleInputChange('business', 'address', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'ai':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">AI Personality</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Personality Type
                  </label>
                  <select
                    value={settings.ai.personality}
                    onChange={(e) => handleInputChange('ai', 'personality', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="professional">Professional & Formal</option>
                    <option value="friendly">Friendly & Approachable</option>
                    <option value="efficient">Efficient & Direct</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Custom Greeting
                  </label>
                  <textarea
                    value={settings.ai.greeting}
                    onChange={(e) => handleInputChange('ai', 'greeting', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Enter a custom greeting message..."
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Business Hours</h3>
              <div className="space-y-3">
                {Object.entries(settings.ai.businessHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center space-x-4">
                    <div className="w-20 text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {day}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!hours.closed}
                        onChange={(e) => {
                          const newHours = { ...hours, closed: !e.target.checked }
                          handleInputChange('ai', 'businessHours', {
                            ...settings.ai.businessHours,
                            [day]: newHours
                          })
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Open</span>
                    </div>
                    {!hours.closed && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => {
                            const newHours = { ...hours, open: e.target.value }
                            handleInputChange('ai', 'businessHours', {
                              ...settings.ai.businessHours,
                              [day]: newHours
                            })
                          }}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => {
                            const newHours = { ...hours, close: e.target.value }
                            handleInputChange('ai', 'businessHours', {
                              ...settings.ai.businessHours,
                              [day]: newHours
                            })
                          }}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">AI Features</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Emergency Handling</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Automatically detect and prioritize emergency calls</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.ai.emergencyHandling}
                    onChange={(e) => handleInputChange('ai', 'emergencyHandling', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Spam Filter</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Automatically filter out spam and unwanted calls</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.ai.spamFilter}
                    onChange={(e) => handleInputChange('ai', 'spamFilter', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Email Notifications</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Receive notifications via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.email}
                    onChange={(e) => handleInputChange('notifications', 'email', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">SMS Notifications</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Receive notifications via SMS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.sms}
                    onChange={(e) => handleInputChange('notifications', 'sms', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Daily Digest</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Daily summary of calls and bookings</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.dailyDigest}
                    onChange={(e) => handleInputChange('notifications', 'dailyDigest', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Instant Alerts</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Immediate notifications for important events</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.instantAlerts}
                    onChange={(e) => handleInputChange('notifications', 'instantAlerts', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Add an extra layer of security to your account</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security.twoFactor}
                    onChange={(e) => handleInputChange('security', 'twoFactor', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">API Access</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Allow third-party applications to access your data</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security.apiAccess}
                    onChange={(e) => handleInputChange('security', 'apiAccess', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Billing Information</h3>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">Current Plan</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">CloudGreet Pro</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Monthly Cost:</span>
                    <span className="font-semibold text-slate-900 dark:text-white ml-2">$200</span>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Per Booking:</span>
                    <span className="font-semibold text-slate-900 dark:text-white ml-2">$50</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Payment Method</h3>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">**** **** **** 4242</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Expires 12/25</p>
                    </div>
                  </div>
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                    Update
                  </button>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your account and preferences</p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-8">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}