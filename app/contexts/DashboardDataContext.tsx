'use client'

import React, { createContext, useContext, useCallback, useRef } from 'react'
import useSWR, { mutate, useSWRConfig } from 'swr'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useToast } from './ToastContext'
import { logger } from '@/lib/monitoring'

interface Appointment {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_type: string
  scheduled_date: string
  start_time: string
  end_time: string
  duration: number
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  estimated_value?: number
  address?: string
  notes?: string
  google_calendar_event_id?: string
  created_at: string
  updated_at: string
}

interface DashboardMetrics {
  totalCalls: number
  totalAppointments: number
  totalRevenue: number
  conversionRate: number
  avgCallDuration: number
  customerSatisfaction: number
  monthlyGrowth: number
  revenueProjection: number
  callsThisWeek: number
  appointmentsThisWeek: number
  revenueThisWeek: number
  missedCalls: number
  answeredCalls: number
  callAnswerRate: number
}

interface ChartData {
  callVolume: Array<{ date: string; count: number }>
  bookingRate: Array<{ date: string; rate: number }>
  revenueTrend: Array<{ date: string; amount: number }>
  conversionFunnel: Array<{ stage: string; count: number }>
}

interface OptimisticUpdate {
  id: string
  type: 'create' | 'update' | 'delete'
  data: Partial<Appointment>
  timestamp: number
  rollback: () => void
}

interface DashboardDataContextType {
  // Appointments
  appointments: Appointment[]
  appointmentsLoading: boolean
  appointmentsError: Error | null
  refreshAppointments: () => Promise<void>
  
  // Metrics
  metrics: DashboardMetrics | null
  metricsLoading: boolean
  metricsError: Error | null
  refreshMetrics: () => Promise<void>
  
  // Charts
  chartData: ChartData | null
  chartsLoading: boolean
  chartsError: Error | null
  refreshCharts: () => Promise<void>
  
  // Optimistic Updates
  optimisticUpdates: OptimisticUpdate[]
  addOptimisticUpdate: (update: Omit<OptimisticUpdate, 'timestamp' | 'rollback'>) => void
  removeOptimisticUpdate: (id: string) => void
  rollbackOptimisticUpdate: (id: string) => void
  
  // Global refresh
  refreshAll: () => Promise<void>
  
  // Timeframe
  timeframe: '7d' | '30d' | '90d' | 'custom'
  setTimeframe: (timeframe: '7d' | '30d' | '90d' | 'custom') => void
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined)

// SWR fetcher function
const swrFetcher = async (url: string) => {
  const response = await fetchWithAuth(url)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch data' }))
    throw new Error(error.error || `Failed to fetch (${response.status})`)
  }
  const data = await response.json()
  return data.success ? data : data
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const { showError, showSuccess } = useToast()
  const { cache } = useSWRConfig()
  const [timeframe, setTimeframe] = React.useState<'7d' | '30d' | '90d' | 'custom'>('7d')
  const optimisticUpdatesRef = useRef<OptimisticUpdate[]>([])
  const [optimisticUpdates, setOptimisticUpdates] = React.useState<OptimisticUpdate[]>([])

  // Calculate date range for appointments (last 90 days) - calculate directly to avoid useMemo issues
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(now.getDate() - 90)
  const appointmentsStartDate = startDate.toISOString().split('T')[0]
  const appointmentsEndDate = now.toISOString().split('T')[0]
  
  const {
    data: appointmentsData,
    error: appointmentsError,
    isLoading: appointmentsLoading,
    mutate: mutateAppointments
  } = useSWR<{ appointments: Appointment[] }>(
    `/api/dashboard/calendar?view=agenda&startDate=${appointmentsStartDate}&endDate=${appointmentsEndDate}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 60s cache
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Retry on 401 errors (up to 2 times)
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          if (retryCount < 2) {
            // Wait 1 second before retry
            setTimeout(() => revalidate({ retryCount }), 1000)
          }
        }
        // Don't retry other errors
      },
      onError: (error) => {
        logger.error('Failed to fetch appointments', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }
  )

  // Fetch metrics
  const {
    data: metricsData,
    error: metricsError,
    isLoading: metricsLoading,
    mutate: mutateMetrics
  } = useSWR<{ metrics: DashboardMetrics }>(
    `/api/dashboard/real-metrics?timeframe=${timeframe}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 60s cache
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Retry on 401 errors (up to 2 times)
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          if (retryCount < 2) {
            setTimeout(() => revalidate({ retryCount }), 1000)
          }
        }
      },
      onError: (error) => {
        logger.error('Failed to fetch metrics', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }
  )

  // Fetch charts
  const {
    data: chartsData,
    error: chartsError,
    isLoading: chartsLoading,
    mutate: mutateCharts
  } = useSWR<{ charts: ChartData }>(
    `/api/dashboard/real-charts?timeframe=${timeframe}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 60s cache
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Retry on 401 errors (up to 2 times)
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          if (retryCount < 2) {
            setTimeout(() => revalidate({ retryCount }), 1000)
          }
        }
      },
      onError: (error) => {
        logger.error('Failed to fetch charts', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }
  )

  // Refresh functions - use stable references
  const refreshAppointments = useCallback(async () => {
    if (mutateAppointments) {
      await mutateAppointments()
    }
  }, [mutateAppointments])

  const refreshMetrics = useCallback(async () => {
    if (mutateMetrics) {
      await mutateMetrics()
    }
  }, [mutateMetrics])

  const refreshCharts = useCallback(async () => {
    if (mutateCharts) {
      await mutateCharts()
    }
  }, [mutateCharts])

  const refreshAll = useCallback(async () => {
    const promises = []
    if (mutateAppointments) promises.push(mutateAppointments())
    if (mutateMetrics) promises.push(mutateMetrics())
    if (mutateCharts) promises.push(mutateCharts())
    await Promise.all(promises)
  }, [mutateAppointments, mutateMetrics, mutateCharts])

  // Optimistic update management
  const addOptimisticUpdate = useCallback((update: Omit<OptimisticUpdate, 'timestamp' | 'rollback'>) => {
    const optimisticUpdate: OptimisticUpdate = {
      ...update,
      timestamp: Date.now(),
      rollback: () => {
        // Rollback logic will be implemented per update type
        setOptimisticUpdates(prev => prev.filter(u => u.id !== update.id))
      }
    }
    
    setOptimisticUpdates(prev => [...prev, optimisticUpdate])
    optimisticUpdatesRef.current = [...optimisticUpdatesRef.current, optimisticUpdate]
  }, [])

  const removeOptimisticUpdate = useCallback((id: string) => {
    setOptimisticUpdates(prev => prev.filter(u => u.id !== id))
    optimisticUpdatesRef.current = optimisticUpdatesRef.current.filter(u => u.id !== id)
  }, [])

  const rollbackOptimisticUpdate = useCallback((id: string) => {
    const update = optimisticUpdatesRef.current.find(u => u.id === id)
    if (update) {
      update.rollback()
      removeOptimisticUpdate(id)
    }
  }, [removeOptimisticUpdate])

  // Clean up old optimistic updates (older than 10 seconds)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setOptimisticUpdates(prev => {
        const filtered = prev.filter(u => now - u.timestamp < 10000)
        optimisticUpdatesRef.current = filtered
        return filtered
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Extract appointments from API response and apply optimistic updates
  // Use a function instead of useMemo to avoid initialization issues
  const getAppointments = React.useCallback(() => {
    if (!appointmentsData) return []
    
    // Get base appointments from API
    const baseAppointments = appointmentsData.appointments || []
    
    // If no optimistic updates, return base appointments
    if (!optimisticUpdates || optimisticUpdates.length === 0) {
      return baseAppointments
    }
    
    // Apply optimistic updates
    let result = [...baseAppointments]
    for (const update of optimisticUpdates) {
      if (update.type === 'create') {
        // Add new appointment to the list
        result = [...result, update.data as Appointment]
      } else if (update.type === 'update') {
        // Update existing appointment
        result = result.map(apt => 
          apt.id === update.id 
            ? { ...apt, ...update.data } 
            : apt
        )
      } else if (update.type === 'delete') {
        // Remove appointment from list
        result = result.filter(apt => apt.id !== update.id)
      }
    }
    
    return result
  }, [appointmentsData, optimisticUpdates])
  
  // Call the function to get appointments
  const appointments = getAppointments()

  // Construct context value - plain object, React will handle optimization
  const value: DashboardDataContextType = {
    appointments: appointments || [],
    appointmentsLoading: appointmentsLoading || false,
    appointmentsError: (appointmentsError as Error | null) || null,
    refreshAppointments,
    
    metrics: metricsData?.metrics || null,
    metricsLoading: metricsLoading || false,
    metricsError: (metricsError as Error | null) || null,
    refreshMetrics,
    
    chartData: chartsData?.charts || null,
    chartsLoading: chartsLoading || false,
    chartsError: (chartsError as Error | null) || null,
    refreshCharts,
    
    optimisticUpdates: optimisticUpdates || [],
    addOptimisticUpdate,
    removeOptimisticUpdate,
    rollbackOptimisticUpdate,
    
    refreshAll,
    
    timeframe: timeframe || '7d',
    setTimeframe
  }

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  )
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext)
  if (context === undefined) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider')
  }
  return context
}

