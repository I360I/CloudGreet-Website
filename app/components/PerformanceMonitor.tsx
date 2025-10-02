'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PerformanceMetrics {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
  memoryUsage?: number
  renderTime: number
}

interface PerformanceMonitorProps {
  enabled?: boolean
  showMetrics?: boolean
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
}

export default function PerformanceMonitor({
  enabled = true,
  showMetrics = false,
  onMetricsUpdate
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const measurePerformance = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach((entry) => {
        if (entry.entryType === 'paint') {
          if (entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({
              ...prev,
              fcp: entry.startTime
            } as PerformanceMetrics))
          }
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          setMetrics(prev => ({
            ...prev,
            lcp: entry.startTime
          } as PerformanceMetrics))
        }
        
        if (entry.entryType === 'first-input') {
          setMetrics(prev => ({
            ...prev,
            fid: (entry as any).processingStart - entry.startTime
          } as PerformanceMetrics))
        }
        
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          setMetrics(prev => ({
            ...prev,
            cls: (prev?.cls || 0) + (entry as any).value
          } as PerformanceMetrics))
        }
      })
    })

    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] })
    } catch (e) {
      console.warn('Performance Observer not supported')
    }

    // Measure TTFB
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      setMetrics(prev => ({
        ...prev,
        ttfb: navigation.responseStart - navigation.requestStart
      } as PerformanceMetrics))
    }

    // Measure memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
      } as PerformanceMetrics))
    }

    return () => observer.disconnect()
  }, [enabled])

  useEffect(() => {
    const cleanup = measurePerformance()
    
    // Measure render time
    const renderStart = performance.now()
    const renderTime = performance.now() - renderStart
    
    setMetrics(prev => ({
      ...prev,
      renderTime
    } as PerformanceMetrics))

    return cleanup
  }, [measurePerformance])

  useEffect(() => {
    if (metrics && onMetricsUpdate) {
      onMetricsUpdate(metrics)
    }
  }, [metrics, onMetricsUpdate])

  const getPerformanceGrade = (metric: number, thresholds: [number, number]) => {
    if (metric <= thresholds[0]) return 'A'
    if (metric <= thresholds[1]) return 'B'
    return 'C'
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-500'
      case 'B': return 'text-yellow-500'
      case 'C': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  if (!enabled || !showMetrics || !metrics) return null

  const fcpGrade = getPerformanceGrade(metrics.fcp, [1800, 3000])
  const lcpGrade = getPerformanceGrade(metrics.lcp, [2500, 4000])
  const fidGrade = getPerformanceGrade(metrics.fid, [100, 300])
  const clsGrade = getPerformanceGrade(metrics.cls, [0.1, 0.25])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-white text-xs z-50"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Performance</h3>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="text-white/60 hover:text-white transition-colors"
          >
            {isVisible ? '−' : '+'}
          </button>
        </div>
        
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            <div className="flex justify-between">
              <span>FCP:</span>
              <span className={getGradeColor(fcpGrade)}>
                {metrics.fcp.toFixed(0)}ms {fcpGrade}
              </span>
            </div>
            <div className="flex justify-between">
              <span>LCP:</span>
              <span className={getGradeColor(lcpGrade)}>
                {metrics.lcp.toFixed(0)}ms {lcpGrade}
              </span>
            </div>
            <div className="flex justify-between">
              <span>FID:</span>
              <span className={getGradeColor(fidGrade)}>
                {metrics.fid.toFixed(0)}ms {fidGrade}
              </span>
            </div>
            <div className="flex justify-between">
              <span>CLS:</span>
              <span className={getGradeColor(clsGrade)}>
                {metrics.cls.toFixed(3)} {clsGrade}
              </span>
            </div>
            <div className="flex justify-between">
              <span>TTFB:</span>
              <span>{metrics.ttfb.toFixed(0)}ms</span>
            </div>
            {metrics.memoryUsage && (
              <div className="flex justify-between">
                <span>Memory:</span>
                <span>{metrics.memoryUsage.toFixed(1)}MB</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Render:</span>
              <span>{metrics.renderTime.toFixed(2)}ms</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
