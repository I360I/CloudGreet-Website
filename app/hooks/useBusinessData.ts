'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import {
  getBusinessTheme,
  getServiceColor,
  getBusinessLabel,
  getServiceIcon,
  formatBusinessDate,
  formatBusinessTime,
  formatCurrency,
  formatPhoneDisplay,
  type BusinessTheme
} from '@/lib/business-theme'
import { logger } from '@/lib/monitoring'

export interface Business {
  id: string
  name: string
  type: string
  services: string[]
  jobTypes: string[]
  hours: Record<string, any>
  timezone: string
  averageAppointmentDuration: number
  greetingMessage: string
  tone: string
  address: string
  city: string
  state: string
  zipCode: string
  phoneNumber: string
  email: string
  website: string | null
  calendarConnected: boolean
  stripeCustomerId: string | null
}

export interface BusinessConfig {
  business: Business
  theme: BusinessTheme
}

interface UseBusinessDataReturn {
  business: Business | null
  theme: BusinessTheme | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  getServiceColor: (serviceName: string) => string
  getBusinessLabel: (term: string) => string
  getServiceIcon: (serviceName: string) => string
  formatDate: (date: Date) => string
  formatTime: (time: string) => string
  formatCurrency: (amount: number | null | undefined) => string
  formatPhone: (phone: string) => string
}

const CACHE_TTL_MS = 60000 // 60 seconds
let cache: { data: BusinessConfig | null; timestamp: number } = {
  data: null,
  timestamp: 0
}

export function useBusinessData(): UseBusinessDataReturn {
  const [business, setBusiness] = useState<Business | null>(null)
  const [theme, setTheme] = useState<BusinessTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBusinessConfig = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check cache
      const now = Date.now()
      if (cache.data && (now - cache.timestamp) < CACHE_TTL_MS) {
        setBusiness(cache.data.business)
        setTheme(cache.data.theme)
        setLoading(false)
        return
      }

      // Fetch from API
      const response = await fetchWithAuth('/api/dashboard/business-config')
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.')
        }
        if (response.status === 404) {
          throw new Error('Business not found')
        }
        throw new Error('Failed to fetch business configuration')
      }

      const result = await response.json()
      
      if (!result.success || !result.business || !result.theme) {
        throw new Error('Invalid response from server')
      }

      // Update cache
      cache = {
        data: {
          business: result.business,
          theme: result.theme
        },
        timestamp: now
      }

      setBusiness(result.business)
      setTheme(result.theme)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error('Failed to fetch business config', { error: errorMessage })
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchBusinessConfig()
  }, [fetchBusinessConfig])

  // Auto-refetch on window focus if cache expired
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now()
      if (cache.data && (now - cache.timestamp) >= CACHE_TTL_MS) {
        fetchBusinessConfig()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchBusinessConfig])

  // Helper functions using cached theme
  const getServiceColorHelper = useCallback((serviceName: string): string => {
    if (!theme || !business) return '#8b5cf6' // fallback
    return theme.serviceColors[serviceName] || theme.primaryColor
  }, [theme, business])

  const getBusinessLabelHelper = useCallback((term: string): string => {
    if (!theme || !business) return term // fallback
    return theme.labelMap[term.toLowerCase()] || term
  }, [theme, business])

  const getServiceIconHelper = useCallback((serviceName: string): string => {
    if (!theme) return 'Circle' // fallback
    return theme.iconMap[serviceName] || 'Circle'
  }, [theme])

  const formatDateHelper = useCallback((date: Date): string => {
    if (!business) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return formatBusinessDate(date, business.timezone)
  }, [business])

  const formatTimeHelper = useCallback((time: string): string => {
    if (!business) {
      // Fallback formatting
      const [hours, minutes] = time.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
    }
    return formatBusinessTime(time, business.timezone)
  }, [business])

  return {
    business,
    theme,
    loading,
    error,
    refetch: fetchBusinessConfig,
    getServiceColor: getServiceColorHelper,
    getBusinessLabel: getBusinessLabelHelper,
    getServiceIcon: getServiceIconHelper,
    formatDate: formatDateHelper,
    formatTime: formatTimeHelper,
    formatCurrency,
    formatPhone: formatPhoneDisplay
  }
}

