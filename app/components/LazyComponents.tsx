'use client'

import React, { Suspense } from 'react'
import { CardSkeleton, ChartSkeleton, HeatmapSkeleton, CallPlayerSkeleton, InsightsSkeleton, TableSkeleton } from './ui/Skeleton'

// Lazy load components with proper fallbacks
export const LazyROICalculator = React.lazy(() => import('../components/ROICalculator'))
export const LazyCallQualityMetrics = React.lazy(() => import('../components/CallQualityMetrics'))
// LeadScoring component disabled - component has type errors that need to be resolved
export const LazyLeadScoring = React.lazy(async () => ({ default: () => null }))
export const LazyBusinessHoursSettings = React.lazy(() => import('../components/BusinessHoursSettings'))
export const LazySMSReplyModal = React.lazy(() => import('../components/SMSReplyModal'))
export const LazyExportButton = React.lazy(() => import('../components/ExportButton'))

// Wrapper components with proper fallbacks
export function ROICalculatorWrapper({ businessId }: { businessId: string }) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <LazyROICalculator businessId={businessId} />
    </Suspense>
  )
}

export function CallQualityMetricsWrapper({ businessId }: { businessId: string }) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <LazyCallQualityMetrics businessId={businessId} />
    </Suspense>
  )
}

export function LeadScoringWrapper({ businessId }: { businessId: string }) {
  return (
    <Suspense fallback={<TableSkeleton rows={3} />}>
      {/* LeadScoring component disabled - type errors need to be resolved */}
      <div />
    </Suspense>
  )
}

export function BusinessHoursSettingsWrapper({ businessId }: { businessId: string }) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <LazyBusinessHoursSettings businessId={businessId} />
    </Suspense>
  )
}

export function SMSReplyModalWrapper({ 
  isOpen, 
  onClose, 
  contact,
  businessId 
}: { 
  isOpen: boolean
  onClose: () => void
  contact: {
    name: string
    phone: string
    email?: string
  }
  businessId: string
}) {
  if (!isOpen) return null
  
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <CardSkeleton className="w-96 h-64" />
    </div>}>
      <LazySMSReplyModal 
        isOpen={isOpen}
        onClose={onClose}
        contact={contact}
        businessId={businessId}
      />
    </Suspense>
  )
}

export function ExportButtonWrapper({ 
  onExport,
  disabled,
  className 
}: { 
  onExport: (format: 'csv' | 'pdf' | 'excel') => Promise<void>
  disabled?: boolean
  className?: string
}) {
  return (
    <Suspense fallback={<div className={`animate-pulse bg-gray-700/50 rounded-lg h-10 w-24 ${className}`} />}>
      <LazyExportButton onExport={onExport} disabled={disabled} className={className} />
    </Suspense>
  )
}

// Preload components for better UX
export function preloadComponents() {
  // Preload components that are likely to be used
  import('../components/ROICalculator')
  import('../components/CallQualityMetrics')
  // import('../components/LeadScoring') // disabled - type errors need resolution
  import('../components/BusinessHoursSettings')
}

// Component loading status
export function useComponentLoading() {
  const [loadedComponents, setLoadedComponents] = React.useState<Set<string>>(new Set())
  
  const markComponentLoaded = React.useCallback((componentName: string) => {
    setLoadedComponents(prev => {
      const newSet = new Set(prev)
      newSet.add(componentName)
      return newSet
    })
  }, [])
  
  const isComponentLoaded = React.useCallback((componentName: string) => {
    return loadedComponents.has(componentName)
  }, [loadedComponents])
  
  return { markComponentLoaded, isComponentLoaded }
}
