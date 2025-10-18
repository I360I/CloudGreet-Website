'use client'

import { useState, useEffect } from 'react'

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
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/data')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch: fetchDashboardData }
}

export function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/dashboard/metrics')
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const metricsData = await response.json()
      setMetrics(metricsData)
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  return { metrics, loading, refetch: fetchMetrics }
}
