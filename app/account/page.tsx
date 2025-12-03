'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Shield, Key, Bell } from 'lucide-react'
import Link from 'next/link'
import { PageLoader } from '../components/LoadingSpinner'
import { logger } from '@/lib/monitoring'
import ProfileTab from '../components/account/ProfileTab'
import SecurityTab from '../components/account/SecurityTab'
import NotificationsTab from '../components/account/NotificationsTab'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

interface UserProfile {
  name: string
  email: string
  phone: string,
  businessName: string,
  businessType: string,
  address: string,
  role: string
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile')
  
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: '',
    address: '',
    role: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      // Authentication handled automatically by fetchWithAuth
      const response = await fetchWithAuth('/api/business/profile')

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProfile({
            name: data.data.businessName || '',
            email: data.data.email || '',
            phone: data.data.phone || '',
            businessName: data.data.businessName || '',
            businessType: data.data.businessType || '',
            address: data.data.address || '',
            role: 'Business Owner'
          })
        }
      }
    } catch (error) {
      logger.error('Error loading profile', { error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <PageLoader text="Loading account information..." />
  }

  const tabs: Array<{ key: 'profile' | 'security' | 'notifications'; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Key },
    { key: 'notifications', label: 'Notifications', icon: Bell }
  ]

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
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Account Settings</h1>
                <p className="text-gray-400 text-xs md:text-sm leading-snug">Manage your account and preferences</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">
                  Account Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex space-x-2 bg-gray-800/50 rounded-xl p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'profile' && (
            <ProfileTab
              profile={profile}
              setProfile={setProfile}
              saving={saving}
              setSaving={setSaving}
              onSave={() => setSaving(true)}
            />
          )}
          {activeTab === 'security' && (
            <SecurityTab
              saving={saving}
              onSave={() => setSaving(true)}
            />
          )}
          {activeTab === 'notifications' && (
            <NotificationsTab
              saving={saving}
              setSaving={setSaving}
              onSave={() => setSaving(true)}
            />
          )}
        </motion.div>
      </div>
    </div>
  )
}