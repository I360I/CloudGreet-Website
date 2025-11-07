'use client'

import useSWR from 'swr'
import { useCallback } from 'react'

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const token = localStorage.getItem('token')
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch data')
  }
  
  return response.json()
}

// Custom hooks for different data types
export function useROIMetrics(businessId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `/api/dashboard/roi-metrics` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    roiData: data?.roi,
    loading: isLoading,
    error,
    refresh
  }
}

export function useCallAnalytics(businessId: string, timeframe: string = '30d') {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `/api/analytics/call-analytics?timeframe=${timeframe}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 2 * 60 * 1000, // 2 minutes
      dedupingInterval: 60 * 1000, // 1 minute
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    analytics: data?.analytics,
    loading: isLoading,
    error,
    refresh
  }
}

export function useAIInsights(businessId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `/api/analytics/ai-insights` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 10 * 60 * 1000, // 10 minutes
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    insights: data?.insights,
    loading: isLoading,
    error,
    refresh
  }
}

export function useCallRecording(callId: string, businessId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    callId && businessId ? `/api/calls/recording?callId=${callId}&businessId=${businessId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // No auto-refresh for recordings
      dedupingInterval: 30 * 60 * 1000, // 30 minutes
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    recording: data?.recording,
    loading: isLoading,
    error,
    refresh
  }
}

export function useQualityMetrics(businessId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `/api/calls/quality-metrics` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 3 * 60 * 1000, // 3 minutes
      dedupingInterval: 60 * 1000, // 1 minute
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    quality: data?.quality,
    loading: isLoading,
    error,
    refresh
  }
}

export function useScoredLeads(businessId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    businessId ? `/api/leads/scored` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  )

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    leads: data?.leads,
    loading: isLoading,
    error,
    refresh
  }
}

// Global cache configuration
export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 0,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  onError: (error: Error) => {
    console.error('SWR Error:', error)
  }
}

