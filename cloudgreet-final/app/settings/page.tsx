"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Settings, Building, Phone, Calendar, 
  CreditCard, Bell, Shield, Users, Zap, Save,
  Edit, Trash2, Plus, Check, X
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business')
  const [isLoading, setIsLoading] = useState(false)
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: '',
    ownerName: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    services: [],
    serviceAreas: [],
    businessHours: {},
    greetingMessage: '',
    tone: 'professional',
    voice: 'alloy',
    customInstructions: '',
    maxCallDuration: 10,
    escalationThreshold: 5,
    escalationPhone: '',
    enableCallRecording: false,
    enableTranscription: false,
    enableSmsForwarding: false,
    notificationPhone: '',
    testMessage: '',
    testResult: ''
  })

  const tabs = [
    { id: 'business', label: 'Business Info', icon: Building },
    { id: 'ai', label: 'AI Configuration', icon: Zap },
    { id: 'phone', label: 'Phone Settings', icon: Phone },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'team', label: 'Team', icon: Users }
  ]

  useEffect(() => {
    // Load business data
    loadBusinessData()
  }, [])

  const loadBusinessData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/business/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBusinessData(data)
      }
    } catch (error) {
      // Console error removed for production
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/business/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(businessData)
      })

      if (response.ok) {
        // Save AI agent settings
        const aiResponse = await fetch('/api/ai-agent/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(businessData)
        })
        
        if (aiResponse.ok) {
          // Console log removed for production
        }
      }
    } catch (error) {
      // Console error removed for production
    } finally {
      setIsLoading(false)
    }
  }

  const testAIAgent = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/ai-agent/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          testMessage: businessData.testMessage,
          testScenario: 'settings_test'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setBusinessData({...businessData, testResult: data.data.aiResponse})
      }
    } catch (error) {
      // Console error removed for production
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-purple-500/20 backdrop-blur-xl bg-black/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">Settings</h1>
            </Link>
            <motion.button
              onClick={handleSave}
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Settings</h2>
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ x: 5 }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                      activeTab === tab.id
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-gray-300 hover:bg-gray-700/30'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </motion.button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-8"
            >
              {activeTab === 'business' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Business Name</label>
                      <input
                        type="text"
                        value={businessData.businessName}
                        onChange={(e) => setBusinessData({...businessData, businessName: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Business Type</label>
                      <select
                        value={businessData.businessType}
                        onChange={(e) => setBusinessData({...businessData, businessType: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="HVAC">HVAC Services</option>
                        <option value="Paint">Painting Services</option>
                        <option value="Roofing">Roofing Services</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Owner Name</label>
                      <input
                        type="text"
                        value={businessData.ownerName}
                        onChange={(e) => setBusinessData({...businessData, ownerName: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={businessData.email}
                        onChange={(e) => setBusinessData({...businessData, email: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={businessData.phone}
                        onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                      <input
                        type="url"
                        value={businessData.website}
                        onChange={(e) => setBusinessData({...businessData, website: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                      <textarea
                        value={businessData.address}
                        onChange={(e) => setBusinessData({...businessData, address: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">AI Configuration</h3>
                  <div className="space-y-8">
                    {/* Basic Settings */}
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Basic Settings</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Greeting Message</label>
                          <textarea
                            value={businessData.greetingMessage}
                            onChange={(e) => setBusinessData({...businessData, greetingMessage: e.target.value})}
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter your AI greeting message..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">AI Tone</label>
                          <select
                            value={businessData.tone}
                            onChange={(e) => setBusinessData({...businessData, tone: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="professional">Professional</option>
                            <option value="friendly">Friendly</option>
                            <option value="casual">Casual</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Voice Settings */}
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Voice Settings</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Voice Selection</label>
                          <select
                            value={businessData.voice || 'alloy'}
                            onChange={(e) => setBusinessData({...businessData, voice: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="alloy">Alloy (Neutral)</option>
                            <option value="echo">Echo (Male)</option>
                            <option value="fable">Fable (British)</option>
                            <option value="onyx">Onyx (Deep)</option>
                            <option value="nova">Nova (Female)</option>
                            <option value="shimmer">Shimmer (Soft)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Max Call Duration (minutes)</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={businessData.maxCallDuration || 10}
                            onChange={(e) => setBusinessData({...businessData, maxCallDuration: parseInt(e.target.value)})}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Advanced Settings</h4>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Custom Instructions</label>
                          <textarea
                            value={businessData.customInstructions || ''}
                            onChange={(e) => setBusinessData({...businessData, customInstructions: e.target.value})}
                            rows={4}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter custom instructions for your AI agent..."
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Escalation Threshold</label>
                            <select
                              value={businessData.escalationThreshold || 5}
                              onChange={(e) => setBusinessData({...businessData, escalationThreshold: parseInt(e.target.value)})}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="1">1 - Always escalate</option>
                              <option value="3">3 - Low confidence</option>
                              <option value="5">5 - Medium confidence</option>
                              <option value="7">7 - High confidence</option>
                              <option value="10">10 - Never escalate</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Escalation Phone</label>
                            <input
                              type="tel"
                              value={businessData.escalationPhone || ''}
                              onChange={(e) => setBusinessData({...businessData, escalationPhone: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Enter phone number"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Features</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={businessData.enableCallRecording || false}
                              onChange={(e) => setBusinessData({...businessData, enableCallRecording: e.target.checked})}
                              className="w-5 h-5 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-white">Enable Call Recording</span>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={businessData.enableTranscription || false}
                              onChange={(e) => setBusinessData({...businessData, enableTranscription: e.target.checked})}
                              className="w-5 h-5 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-white">Enable Transcription</span>
                          </label>
                        </div>
                        <div className="space-y-4">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={businessData.enableSmsForwarding || false}
                              onChange={(e) => setBusinessData({...businessData, enableSmsForwarding: e.target.checked})}
                              className="w-5 h-5 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-white">Enable SMS Forwarding</span>
                          </label>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Notification Phone</label>
                            <input
                              type="tel"
                              value={businessData.notificationPhone || ''}
                              onChange={(e) => setBusinessData({...businessData, notificationPhone: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Enter phone number"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Test AI Agent */}
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Test AI Agent</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Test Message</label>
                          <input
                            type="text"
                            value={businessData.testMessage || ''}
                            onChange={(e) => setBusinessData({...businessData, testMessage: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter test message for AI agent"
                          />
                        </div>
                        <button
                          onClick={testAIAgent}
                          disabled={isLoading}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
                        >
                          {isLoading ? 'Testing...' : 'Test AI Response'}
                        </button>
                        {businessData.testResult && (
                          <div className="bg-gray-800/50 rounded-lg p-4">
                            <h5 className="text-white font-semibold mb-2">AI Response:</h5>
                            <p className="text-gray-300">{businessData.testResult}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'phone' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Phone Settings</h3>
                  <div className="space-y-6">
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Current Phone Number</h4>
                      <p className="text-gray-300 mb-4">Your AI receptionist is currently using:</p>
                      <div className="flex items-center gap-4">
                        <Phone className="w-6 h-6 text-green-400" />
                        <span className="text-xl font-mono text-white">+1 (555) 123-4567</span>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Active</span>
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Call Forwarding</h4>
                      <p className="text-gray-300 mb-4">Configure where calls are forwarded when AI can't handle them.</p>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <input type="radio" id="voicemail" name="forwarding" className="text-purple-500" />
                          <label htmlFor="voicemail" className="text-white">Forward to voicemail</label>
                        </div>
                        <div className="flex items-center gap-4">
                          <input type="radio" id="personal" name="forwarding" className="text-purple-500" />
                          <label htmlFor="personal" className="text-white">Forward to personal phone</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'calendar' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Calendar Integration</h3>
                  <div className="space-y-6">
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Connected Calendars</h4>
                      <p className="text-gray-300 mb-4">No calendars connected yet.</p>
                      <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all">
                        Connect Google Calendar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Billing & Subscription</h3>
                  <div className="space-y-6">
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Current Plan</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold">CloudGreet Pro</p>
                          <p className="text-gray-300">$200/month + $50 per booking</p>
                        </div>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Active</span>
                      </div>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Payment Method</h4>
                      <p className="text-gray-300 mb-4">Manage your payment methods and billing information.</p>
                      <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all">
                        Manage Billing
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Notifications</h3>
                  <div className="space-y-6">
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Email Notifications</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">New Appointments</p>
                            <p className="text-gray-300 text-sm">Get notified when appointments are booked</p>
                          </div>
                          <input type="checkbox" defaultChecked className="text-purple-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">Missed Calls</p>
                            <p className="text-gray-300 text-sm">Get notified about missed calls</p>
                          </div>
                          <input type="checkbox" defaultChecked className="text-purple-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">Weekly Reports</p>
                            <p className="text-gray-300 text-sm">Receive weekly performance reports</p>
                          </div>
                          <input type="checkbox" className="text-purple-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Security</h3>
                  <div className="space-y-6">
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Change Password</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all">
                          Update Password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Team Management</h3>
                  <div className="space-y-6">
                    <div className="bg-gray-700/30 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Team Members</h4>
                      <p className="text-gray-300 mb-4">Manage who has access to your CloudGreet dashboard.</p>
                      <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Invite Team Member
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
