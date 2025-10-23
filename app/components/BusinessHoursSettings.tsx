'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Clock, ToggleLeft, ToggleRight, Save, AlertCircle,
  Sun, Moon, Calendar
} from 'lucide-react'

interface BusinessHours {
  enabled: boolean
  timezone: string
  hours: {
    monday: { start: string; end: string; enabled: boolean }
    tuesday: { start: string; end: string; enabled: boolean }
    wednesday: { start: string; end: string; enabled: boolean }
    thursday: { start: string; end: string; enabled: boolean }
    friday: { start: string; end: string; enabled: boolean }
    saturday: { start: string; end: string; enabled: boolean }
    sunday: { start: string; end: string; enabled: boolean }
  }
  afterHoursMessage: string
  emergencyContact: string
}

interface BusinessHoursSettingsProps {
  businessId: string
}

export default function BusinessHoursSettings({ businessId }: BusinessHoursSettingsProps) {
  const [hours, setHours] = useState<BusinessHours>({
    enabled: false, // Default to 24/7 (disabled)
    timezone: 'America/New_York',
    hours: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '10:00', end: '14:00', enabled: false },
      sunday: { start: '10:00', end: '14:00', enabled: false }
    },
    afterHoursMessage: "Thank you for calling! We're currently closed, but our AI assistant is available 24/7 to help you. How can I assist you today?",
    emergencyContact: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadBusinessHours()
  }, [businessId])

  const loadBusinessHours = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/business/hours?businessId=${businessId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.hours) {
          setHours(data.hours)
        }
      }
    } catch (error) {
      console.error('Error loading business hours:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveBusinessHours = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/business/hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId,
          hours
        })
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        throw new Error('Failed to save business hours')
      }
    } catch (error) {
      console.error('Error saving business hours:', error)
      alert('Failed to save business hours. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: keyof typeof hours.hours) => {
    setHours(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          enabled: !prev.hours[day].enabled
        }
      }
    }))
  }

  const updateDayHours = (day: keyof typeof hours.hours, field: 'start' | 'end', value: string) => {
    setHours(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [field]: value
        }
      }
    }))
  }

  const toggleBusinessHours = () => {
    setHours(prev => ({
      ...prev,
      enabled: !prev.enabled
    }))
  }

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ] as const

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Loading Business Hours...</h3>
            <p className="text-sm text-gray-400">Setting up your schedule</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700/50 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-700/50 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-700/50 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
          <Clock className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Business Hours</h3>
          <p className="text-sm text-gray-400">Configure when your AI is available</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 24/7 Toggle */}
        <div className="bg-gray-700/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-300">24/7 Availability</div>
              <div className="text-sm text-gray-400">
                {hours.enabled ? 'Business hours enabled' : 'AI available 24/7 (recommended)'}
              </div>
            </div>
            <button
              onClick={toggleBusinessHours}
              className="flex items-center gap-2"
            >
              {hours.enabled ? (
                <ToggleRight className="w-8 h-8 text-green-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Business Hours Configuration */}
        {hours.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={hours.timezone}
                onChange={(e) => setHours(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>

            {/* Daily Hours */}
            <div className="space-y-3">
              {days.map((day) => (
                <div key={day.key} className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg">
                  <div className="w-20 text-sm font-medium text-gray-300">
                    {day.label}
                  </div>
                  
                  <button
                    onClick={() => toggleDay(day.key)}
                    className="flex items-center gap-2"
                  >
                    {hours.hours[day.key].enabled ? (
                      <ToggleRight className="w-6 h-6 text-green-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>

                  {hours.hours[day.key].enabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={hours.hours[day.key].start}
                        onChange={(e) => updateDayHours(day.key, 'start', e.target.value)}
                        className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={hours.hours[day.key].end}
                        onChange={(e) => updateDayHours(day.key, 'end', e.target.value)}
                        className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* After Hours Message */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                After Hours Message
              </label>
              <textarea
                value={hours.afterHoursMessage}
                onChange={(e) => setHours(prev => ({ ...prev, afterHoursMessage: e.target.value }))}
                placeholder="Message to play when outside business hours..."
                className="w-full h-20 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Emergency Contact (Optional)
              </label>
              <input
                type="text"
                value={hours.emergencyContact}
                onChange={(e) => setHours(prev => ({ ...prev, emergencyContact: e.target.value }))}
                placeholder="Emergency contact name or number"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </motion.div>
        )}

        {/* 24/7 Notice */}
        {!hours.enabled && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <Sun className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="font-medium text-green-400">24/7 AI Availability</div>
                <div className="text-sm text-green-300">
                  Your AI assistant is always available to help customers, even outside business hours.
                  This is recommended for service businesses to capture every opportunity.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveBusinessHours}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
