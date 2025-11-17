'use client'

import { useCallback, useRef, useState } from 'react'
import { useDashboardData } from '@/app/contexts/DashboardDataContext'
import { useToast } from '@/app/contexts/ToastContext'

interface RefreshOptions {
  showSuccess?: boolean
  showError?: boolean
  silent?: boolean
}

export function useDashboardRefresh() {
  const { refreshAll, refreshAppointments, refreshMetrics, refreshCharts } = useDashboardData()
  const { showSuccess, showError } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced refresh (300ms) to prevent spam
  const debouncedRefresh = useCallback(async (
    refreshFn: () => Promise<void>,
    options: RefreshOptions = {}
  ) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Cancel in-flight request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    return new Promise<void>((resolve, reject) => {
      debounceTimerRef.current = setTimeout(async () => {
        try {
          setIsRefreshing(true)
          setRefreshProgress(0)
          
          abortControllerRef.current = new AbortController()
          
          // Simulate progress for better UX
          const progressInterval = setInterval(() => {
            setRefreshProgress(prev => Math.min(prev + 10, 90))
          }, 50)

          await refreshFn()
          
          clearInterval(progressInterval)
          setRefreshProgress(100)
          
          if (options.showSuccess && !options.silent) {
            showSuccess('Data refreshed', 'Dashboard updated successfully')
          }
          
          // Reset progress after brief delay
          setTimeout(() => {
            setRefreshProgress(0)
            setIsRefreshing(false)
          }, 300)
          
          resolve()
        } catch (error) {
          setRefreshProgress(0)
          setIsRefreshing(false)
          
          if (options.showError && !options.silent) {
            showError(
              'Refresh failed',
              error instanceof Error ? error.message : 'Failed to refresh data'
            )
          }
          
          reject(error)
        }
      }, 300) // 300ms debounce
    })
  }, [showSuccess, showError])

  const refreshAppointmentsDebounced = useCallback(async (options: RefreshOptions = {}) => {
    return debouncedRefresh(refreshAppointments, options)
  }, [debouncedRefresh, refreshAppointments])

  const refreshMetricsDebounced = useCallback(async (options: RefreshOptions = {}) => {
    return debouncedRefresh(refreshMetrics, options)
  }, [debouncedRefresh, refreshMetrics])

  const refreshChartsDebounced = useCallback(async (options: RefreshOptions = {}) => {
    return debouncedRefresh(refreshCharts, options)
  }, [debouncedRefresh, refreshCharts])

  const refreshAllDebounced = useCallback(async (options: RefreshOptions = {}) => {
    return debouncedRefresh(async () => {
      await Promise.all([
        refreshAppointments(),
        refreshMetrics(),
        refreshCharts()
      ])
    }, options)
  }, [debouncedRefresh, refreshAppointments, refreshMetrics, refreshCharts])

  const cancelRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsRefreshing(false)
    setRefreshProgress(0)
  }, [])

  return {
    refreshAll: refreshAllDebounced,
    refreshAppointments: refreshAppointmentsDebounced,
    refreshMetrics: refreshMetricsDebounced,
    refreshCharts: refreshChartsDebounced,
    isRefreshing,
    refreshProgress,
    cancelRefresh
  }
}

