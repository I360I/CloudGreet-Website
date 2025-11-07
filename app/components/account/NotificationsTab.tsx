'use client'

import React, { useState } from 'react'
import { Bell, Save } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  callNotifications: boolean
  marketingEmails: boolean
}

interface NotificationsTabProps {
  saving: boolean
  setSaving: (saving: boolean) => void
  onSave: () => void
}

export default function NotificationsTab({ saving, setSaving, onSave }: NotificationsTabProps) {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    callNotifications: true,
    marketingEmails: false
  })
  
  const { showSuccess, showError } = useToast()

  const handleSaveNotifications = async () => {
    setSaving(true)
    try {
      // Simulate saving notification settings
      await new Promise(resolve => setTimeout(resolve, 1000))
      showSuccess('Settings Saved', 'Your notification preferences have been updated')
    } catch (error) {
      showError('Save Failed', 'Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (setting: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
  }

  return (
    <div className="space-y-8">
      {/* Notification Settings */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Bell className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Notification Preferences</h3>
            <p className="text-gray-400 text-sm">Choose how you want to be notified</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <h4 className="text-white font-medium">Email Notifications</h4>
              <p className="text-gray-400 text-sm">Receive important updates via email</p>
            </div>
            <button
              onClick={() => handleToggle('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationSettings.emailNotifications ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <h4 className="text-white font-medium">SMS Notifications</h4>
              <p className="text-gray-400 text-sm">Get text messages for urgent updates</p>
            </div>
            <button
              onClick={() => handleToggle('smsNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationSettings.smsNotifications ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Call Notifications */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <h4 className="text-white font-medium">Call Notifications</h4>
              <p className="text-gray-400 text-sm">Notifications about incoming calls</p>
            </div>
            <button
              onClick={() => handleToggle('callNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationSettings.callNotifications ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings.callNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Marketing Emails */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div>
              <h4 className="text-white font-medium">Marketing Emails</h4>
              <p className="text-gray-400 text-sm">Receive promotional content and updates</p>
            </div>
            <button
              onClick={() => handleToggle('marketingEmails')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationSettings.marketingEmails ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings.marketingEmails ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSaveNotifications}
            disabled={saving}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Notification History */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-orange-500/20 rounded-xl">
            <Bell className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Recent Notifications</h3>
            <p className="text-gray-400 text-sm">Your recent notification activity</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-white font-medium">Profile Updated</p>
              <p className="text-gray-400 text-sm">Your account information was successfully updated</p>
            </div>
            <span className="text-gray-400 text-sm">2 hours ago</span>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-white font-medium">New Appointment</p>
              <p className="text-gray-400 text-sm">You have a new appointment scheduled for tomorrow</p>
            </div>
            <span className="text-gray-400 text-sm">1 day ago</span>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <div className="flex-1">
              <p className="text-white font-medium">System Maintenance</p>
              <p className="text-gray-400 text-sm">Scheduled maintenance will occur tonight at 2 AM</p>
            </div>
            <span className="text-gray-400 text-sm">3 days ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}
