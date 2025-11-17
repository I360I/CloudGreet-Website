'use client'

import React, { createContext, useContext, useCallback, useRef } from 'react'
import useSWR, { mutate, useSWRConfig } from 'swr'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useToast } from './ToastContext'

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

  // Calculate date range for appointments (last 90 days) - use useMemo to avoid initialization issues
  const appointmentsDateRange = React.useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 90)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    }
  }, [])
  
  const {
    data: appointmentsData,
    error: appointmentsError,
    isLoading: appointmentsLoading,
    mutate: mutateAppointments
  } = useSWR<{ appointments: Appointment[] }>(
    `/api/dashboard/calendar?view=agenda&startDate=${appointmentsDateRange.startDate}&endDate=${appointmentsDateRange.endDate}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 60s cache
      onError: (error) => {
        console.error('Failed to fetch appointments:', error)
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
      onError: (error) => {
        console.error('Failed to fetch metrics:', error)
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
      onError: (error) => {
        console.error('Failed to fetch charts:', error)
      }
    }
  )

  // Refresh functions
  const refreshAppointments = useCallback(async () => {
    await mutateAppointments()
  }, [mutateAppointments])

  const refreshMetrics = useCallback(async () => {
    await mutateMetrics()
  }, [mutateMetrics])

  const refreshCharts = useCallback(async () => {
    await mutateCharts()
  }, [mutateCharts])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      mutateAppointments(),
      mutateMetrics(),
      mutateCharts()
    ])
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
  const appointments = React.useMemo(() => {
    if (!appointmentsData) return []
    
    // Get base appointments from API
    let baseAppointments = appointmentsData.appointments || []
    
    // Apply optimistic updates
    optimisticUpdates.forEach(update => {
      if (update.type === 'create') {
        // Add new appointment to the list
        baseAppointments = [...baseAppointments, update.data as Appointment]
      } else if (update.type === 'update') {
        // Update existing appointment
        baseAppointments = baseAppointments.map(apt => 
          apt.id === update.id 
            ? { ...apt, ...update.data } 
            : apt
        )
      } else if (update.type === 'delete') {
        // Remove appointment from list
        baseAppointments = baseAppointments.filter(apt => apt.id !== update.id)
      }
    })
    
    return baseAppointments
  }, [appointmentsData, optimisticUpdates])

  const value: DashboardDataContextType = {
    appointments,
    appointmentsLoading,
    appointmentsError: appointmentsError as Error | null,
    refreshAppointments,
    
    metrics: metricsData?.metrics || null,
    metricsLoading,
    metricsError: metricsError as Error | null,
    refreshMetrics,
    
    chartData: chartsData?.charts || null,
    chartsLoading,
    chartsError: chartsError as Error | null,
    refreshCharts,
    
    optimisticUpdates,
    addOptimisticUpdate,
    removeOptimisticUpdate,
    rollbackOptimisticUpdate,
    
    refreshAll,
    
    timeframe,
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

