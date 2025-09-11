import useSWR from 'swr'
import { useState, useEffect } from 'react'

interface DashboardData {
  calls: {
    totalToday: number
    totalWeek: number
    totalMonth: number
  }
  bookings: {
    totalToday: number
    totalWeek: number
    totalMonth: number
  }
  revenue: {
    totalToday: number
    totalWeek: number
    totalMonth: number
  }
  answerRate: number
}

interface SystemStatus {
  phone: 'connected' | 'disconnected' | 'connecting'
  calendar: 'connected' | 'disconnected' | 'connecting'
  ai: 'active' | 'inactive' | 'training'
  speech: 'ready' | 'not_ready' | 'processing'
}

interface ActiveCall {
  id: string
  caller: string
  duration: number
  status: 'ringing' | 'active' | 'ended'
  timestamp: Date
}

interface RecentActivity {
  id: string
  type: 'call' | 'booking' | 'payment'
  description: string
  timestamp: Date
  amount?: number
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch data')
  }
  return response.json()
}

// Custom hook for dashboard data with caching and real-time updates
export function useDashboardData(businessName: string = 'Demo User', range: string = '30d') {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isOnline, setIsOnline] = useState(true)

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // SWR configuration with advanced caching
  const swrConfig = {
    refreshInterval: 60000, // Refresh every 60 seconds (less frequent)
    revalidateOnFocus: false, // Disable focus revalidation for faster loading
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // Dedupe requests within 30 seconds
    errorRetryCount: 2, // Fewer retries
    errorRetryInterval: 10000, // Longer retry interval
    onSuccess: () => setLastUpdated(new Date()),
    onError: (error: Error) => {
      console.error('Dashboard data fetch error:', error)
    }
  }

  // Fetch dashboard data
  const { data: dashboardData, error: dashboardError, mutate: mutateDashboard } = useSWR(
    `/api/dashboard?businessName=${encodeURIComponent(businessName)}&range=${range}`,
    fetcher,
    swrConfig
  )

  // Fetch system status
  const { data: systemStatus, error: statusError, mutate: mutateStatus } = useSWR(
    '/api/system-status',
    fetcher,
    { ...swrConfig, refreshInterval: 30000 } // Less frequent status checks
  )

  // Fetch active calls
  const { data: activeCalls, error: callsError, mutate: mutateCalls } = useSWR(
    '/api/active-calls',
    fetcher,
    { ...swrConfig, refreshInterval: 15000 } // Less frequent for better performance
  )

  // Fetch recent activity
  const { data: recentActivity, error: activityError, mutate: mutateActivity } = useSWR(
    '/api/recent-activity',
    fetcher,
    { ...swrConfig, refreshInterval: 30000 } // Less frequent for better performance
  )

  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
    lastError: null as string | null
  })

  // Track performance
  useEffect(() => {
    const startTime = performance.now()
    
    const timer = setTimeout(() => {
      const loadTime = performance.now() - startTime
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: Math.round(loadTime)
      }))
    }, 100)

    return () => clearTimeout(timer)
  }, [dashboardData])

  // Error tracking
  useEffect(() => {
    const errors = [dashboardError, statusError, callsError, activityError].filter(Boolean)
    if (errors.length > 0) {
      setPerformanceMetrics(prev => ({
        ...prev,
        errorRate: errors.length,
        lastError: errors[0]?.message || 'Unknown error'
      }))
    }
  }, [dashboardError, statusError, callsError, activityError])

  // Manual refresh function
  const refreshAll = async () => {
    await Promise.all([
      mutateDashboard(),
      mutateStatus(),
      mutateCalls(),
      mutateActivity()
    ])
  }

  // Optimistic updates for better UX
  const optimisticUpdate = (type: 'call' | 'booking' | 'revenue', value: number) => {
    if (dashboardData) {
      const updatedData = { ...dashboardData }
      
      switch (type) {
        case 'call':
          updatedData.calls.totalToday += value
          break
        case 'booking':
          updatedData.bookings.totalToday += value
          break
        case 'revenue':
          updatedData.revenue.totalToday += value
          break
      }
      
      // Optimistically update the cache
      mutateDashboard(updatedData, false)
    }
  }

  // Cache management
  const clearCache = () => {
    mutateDashboard(undefined, true)
    mutateStatus(undefined, true)
    mutateCalls(undefined, true)
    mutateActivity(undefined, true)
  }

  // Loading state
  const isLoading = !dashboardData && !dashboardError

  // Error state
  const hasError = dashboardError || statusError || callsError || activityError

  return {
    // Data
    dashboardData: dashboardData as DashboardData | undefined,
    systemStatus: systemStatus as SystemStatus | undefined,
    activeCalls: activeCalls as ActiveCall[] | undefined,
    recentActivity: recentActivity as RecentActivity[] | undefined,
    
    // State
    isLoading,
    hasError,
    isOnline,
    lastUpdated,
    performanceMetrics,
    
    // Actions
    refreshAll,
    optimisticUpdate,
    clearCache,
    
    // Individual mutate functions
    mutateDashboard,
    mutateStatus,
    mutateCalls,
    mutateActivity,
    
    // Errors
    errors: {
      dashboard: dashboardError,
      status: statusError,
      calls: callsError,
      activity: activityError
    }
  }
}

// Hook for real-time performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    errorCount: 0
  })

  useEffect(() => {
    const measurePerformance = () => {
      // Measure render time
      const renderStart = performance.now()
      requestAnimationFrame(() => {
        const renderTime = performance.now() - renderStart
        setMetrics(prev => ({ ...prev, renderTime: Math.round(renderTime) }))
      })

      // Measure memory usage (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({ 
          ...prev, 
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024) // MB
        }))
      }

      // Measure network latency
      const start = performance.now()
      fetch('/api/ping', { method: 'HEAD' })
        .then(() => {
          const latency = performance.now() - start
          setMetrics(prev => ({ ...prev, networkLatency: Math.round(latency) }))
        })
        .catch(() => {
          setMetrics(prev => ({ ...prev, networkLatency: -1 }))
        })
    }

    // Measure performance every 30 seconds
    const interval = setInterval(measurePerformance, 30000)
    measurePerformance() // Initial measurement

    return () => clearInterval(interval)
  }, [])

  return metrics
}

// Hook for offline support
export function useOfflineSupport() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [offlineData, setOfflineData] = useState<any>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      // Sync offline data when coming back online
      if (offlineData) {
        // Implement sync logic here
        console.log('Syncing offline data:', offlineData)
        setOfflineData(null)
      }
    }

    const handleOffline = () => {
      setIsOffline(true)
      // Store current data for offline use
      const currentData = localStorage.getItem('dashboardData')
      if (currentData) {
        setOfflineData(JSON.parse(currentData))
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [offlineData])

  return {
    isOffline,
    offlineData,
    hasOfflineData: !!offlineData
  }
}
