'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Card } from './ui/Card'
import { logger } from '@/lib/monitoring'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { Button } from './ui/Button'
import type { JobDetails, PricingRule, Estimate, Lead, ContactInfo, Appointment, Business, AISettings, AIAgent, WebSocketMessage, SessionData, ValidationResult, QueryResult, RevenueOptimizedConfig, PricingScripts, ObjectionHandling, ClosingTechniques, AgentData, PhoneValidationResult, LeadScoringResult, ContactActivity, ReminderMessage, TestResult, WorkingPromptConfig, AgentConfiguration, ValidationFunction, ErrorDetails, APIError, APISuccess, APIResponse, PaginationParams, PaginatedResponse, FilterParams, SortParams, QueryParams, DatabaseError, SupabaseResponse, RateLimitConfig, SecurityHeaders, LogEntry, HealthCheckResult, ServiceHealth, MonitoringAlert, PerformanceMetrics, BusinessMetrics, CallMetrics, LeadMetrics, RevenueMetrics, DashboardData, ExportOptions, ImportResult, BackupConfig, MigrationResult, FeatureFlag, A_BTest, ComplianceConfig, AuditLog, SystemConfig } from '@/lib/types/common';

interface DayHours {
  open: string,
  close: string,
  closed: boolean
}

interface BusinessHours {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours,
  friday: DayHours,
  saturday: DayHours,
  sunday: DayHours,
  timezone: string
}

interface BusinessHoursSettingsProps {
  businessId: string
  className?: string
}

export default function BusinessHoursSettings({ businessId, className = '' }: BusinessHoursSettingsProps) {
  const { theme } = useBusinessData()
  const [hours, setHours] = useState<BusinessHours | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  useEffect(() => {
    loadBusinessHours()
  }, [businessId])

  const loadBusinessHours = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth(`/api/business/hours?businessId=${businessId}`)
      
      if (response.ok) {
        const data = await response.json()
        setHours(data.hours)
      } else {
        logger.error('Failed to load business hours', { businessId, status: response.status })
        // Set default hours if API fails
        setHours({
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '10:00', close: '14:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
          timezone: 'America/New_York'
        })
      }
    } catch (error) {
      logger.error('Error loading business hours', { error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const saveBusinessHours = async () => {
    if (!hours) return;
    try {
      setSaving(true)
      const response = await fetchWithAuth(`/api/business/hours?businessId=${businessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hours })
      })
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Business hours saved successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Failed to save business hours' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error saving business hours:', error)
      setMessage({ type: 'error', text: 'Failed to save business hours' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateDayHours = (day: keyof Omit<BusinessHours, 'timezone'>, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    if (!hours) return;
  const currentDayHours = hours[day] || { open: '09:00', close: '17:00', closed: false }
    
    setHours({
      ...hours,
      [day]: {
        ...currentDayHours,
        [field]: value
      }
    })
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
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-700/50 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!hours) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-500" />
        <h3 className="text-lg font-semibold text-white mb-2">No Hours Set</h3>
        <p className="text-gray-400 mb-4">Unable to load business hours</p>
        <Button 
          onClick={loadBusinessHours}
          style={{ backgroundColor: primaryColor }}
        >
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5" style={{ color: primaryColor }} />
          Business Hours Settings
        </h3>
        
        <div className="flex gap-2">
          <Button 
            onClick={loadBusinessHours}
            variant="secondary"
            className="text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button 
            onClick={saveBusinessHours}
            disabled={saving}
            style={{ backgroundColor: primaryColor }}
            className="text-sm"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{message.text}</span>
        </motion.div>
      )}

      {/* Timezone */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
        <select
          value={hours.timezone}
          onChange={(e) => setHours({ ...hours, timezone: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
          style={{ 
            '--tw-ring-color': primaryColor + '50',
            '--tw-border-color': primaryColor + '50'
          } as React.CSSProperties & { '--tw-ring-color'?: string; '--tw-border-color'?: string }}
        >
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Chicago">Central Time (CT)</option>
          <option value="America/Denver">Mountain Time (MT)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
        </select>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {days.map((day, index) => (
          <motion.div
            key={day.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-slate-800/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!hours[day.key].closed}
                  onChange={(e) => updateDayHours(day.key, 'closed', !e.target.checked)}
                  className="w-4 h-4 bg-slate-700 border-slate-600 rounded focus:ring-2"
                  style={{ 
                    accentColor: primaryColor,
                    '--tw-ring-color': primaryColor
                  } as React.CSSProperties & { accentColor?: string; '--tw-ring-color'?: string }}
                />
                <span className="font-medium text-white w-20">{day.label}</span>
              </div>
              
              {!hours[day.key].closed ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={hours[day.key].open}
                    onChange={(e) => updateDayHours(day.key, 'open', e.target.value)}
                    className="px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2"
                    style={{ 
                      '--tw-ring-color': primaryColor + '50',
                      '--tw-border-color': primaryColor + '50'
                    } as React.CSSProperties & { '--tw-ring-color'?: string; '--tw-border-color'?: string }}
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="time"
                    value={hours[day.key].close}
                    onChange={(e) => updateDayHours(day.key, 'close', e.target.value)}
                    className="px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2"
                    style={{ 
                      '--tw-ring-color': primaryColor + '50',
                      '--tw-border-color': primaryColor + '50'
                    } as React.CSSProperties & { '--tw-ring-color'?: string; '--tw-border-color'?: string }}
                  />
                </div>
              ) : (
                <span className="text-slate-500 text-sm">Closed</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <div className="flex gap-2">
          <button
            onClick={() => {
              const standardHours = {
                monday: { open: '09:00', close: '17:00', closed: false },
                tuesday: { open: '09:00', close: '17:00', closed: false },
                wednesday: { open: '09:00', close: '17:00', closed: false },
                thursday: { open: '09:00', close: '17:00', closed: false },
                friday: { open: '09:00', close: '17:00', closed: false },
                saturday: { open: '10:00', close: '14:00', closed: false },
                sunday: { open: '00:00', close: '00:00', closed: true }
              }
              setHours({ ...hours, ...standardHours })
            }}
            className="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors text-sm"
          >
            Set Standard Hours
          </button>
          <button
            onClick={() => {
              const allClosed = Object.keys(hours).reduce((acc, key) => {
                if (key === 'timezone') return acc
                return { ...acc, [key]: { open: '00:00', close: '00:00', closed: true } }
              }, {} as any)
              setHours({ ...hours, ...allClosed })
            }}
            className="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors text-sm"
          >
            Close All Days
          </button>
        </div>
      </div>
    </Card>
  )
}
