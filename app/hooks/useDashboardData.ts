'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring'

interface DashboardData {
  businessId: string
  businessName: string
  phoneNumber: string
  isActive: boolean
  totalCalls: number
  totalAppointments: number
  totalRevenue: number
  recentCalls: Array<{
    id: string
    caller: string
    duration: string
    status: string
    date: string
  }>
  upcomingAppointments: Array<{
    id: string
    customer: string
    service: string
    date: string
    time: string
  }>
  setupStatus: string
  nextSteps: string[]
  onboardingCompleted: boolean
  hasPhoneNumber: boolean
}

interface MetricsData {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  appointmentsScheduled: number
  revenue: number
  averageCallDuration: number
  conversionRate: number
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Use fetchWithAuth for authenticated endpoints
      const { fetchWithAuth } = await import('@/lib/auth/fetch-with-auth')
      const response = await fetchWithAuth('/api/dashboard/data')
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to fetch dashboard data (${response.status})`)
      }

      let dashboardData
      try {
        dashboardData = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }
      setData(dashboardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch: fetchDashboardData }
}

export function useRealtimeMetrics(businessId?: string) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  const fetchMetrics = async () => {
    try {
      // Use fetchWithAuth for authenticated endpoints
      const { fetchWithAuth } = await import('@/lib/auth/fetch-with-auth')
      const response = await fetchWithAuth('/api/dashboard/metrics')
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to fetch metrics (${response.status})`)
      }

      let metricsData
      try {
        metricsData = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }
      setMetrics(metricsData)
    } catch (err) {
      logger.error('Failed to fetch metrics:', { error: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return { metrics, loading, refetch: fetchMetrics }
}
