/**
 * Dashboard Data Hook
 * Custom hook for fetching dashboard data with caching and error handling
 */

import { useState, useEffect, useCallback } from 'react'
import { dashboardCache, fetchWithCache } from '@/lib/dashboard-cache'

interface UseDashboardDataOptions {
  enabled?: boolean
  refetchInterval?: number
  cacheTime?: number
}

export function useDashboardData<T>(
  endpoint: string,
  options: UseDashboardDataOptions = {}
) {
  const {
    enabled = true,
    refetchInterval,
    cacheTime = 5
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)

  const fetchData = useCallback(async (force: boolean = false) => {
    if (!enabled) return

    try {
      setIsLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token')
      }

      const cacheKey = `dashboard:${endpoint}`

      // Use cache if available and not forced
      if (!force) {
        const cached = dashboardCache.get<T>(cacheKey)
        if (cached) {
          setData(cached)
          setIsLoading(false)
          return
        }
      }

      // Fetch fresh data
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setData(result.data)
        dashboardCache.set(cacheKey, result.data, cacheTime)
        setLastFetch(Date.now())
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, enabled, cacheTime])

  // Initial load
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return

    const interval = setInterval(() => {
      fetchData()
    }, refetchInterval)

    return () => clearInterval(interval)
  }, [refetchInterval, enabled, fetchData])

  const refetch = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  const invalidate = useCallback(() => {
    dashboardCache.invalidate(`dashboard:${endpoint}`)
  }, [endpoint])

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidate,
    lastFetch
  }
}

/**
 * Specialized hook for dashboard analytics
 */
export function useDashboardAnalytics(timeframe: string = '30d') {
  return useDashboardData<any>(
    `/api/dashboard/analytics?timeframe=${timeframe}`,
    {
      cacheTime: 10, // 10 minutes cache for analytics
      refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
    }
  )
}

/**
 * Specialized hook for real-time metrics
 */
export function useRealtimeMetrics() {
  return useDashboardData<any>(
    '/api/dashboard/real-metrics',
    {
      cacheTime: 2, // 2 minutes cache for real-time data
      refetchInterval: 2 * 60 * 1000 // Refetch every 2 minutes
    }
  )
}

