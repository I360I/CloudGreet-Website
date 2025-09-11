"use client"

import React, { useState, useEffect } from 'react'
import { Activity, Zap, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage: number
  errorCount: number
  lastUpdate: Date
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    errorCount: 0,
    lastUpdate: new Date()
  })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Simulate performance monitoring
    const updateMetrics = () => {
      setMetrics({
        loadTime: Math.random() * 1000 + 500, // 500-1500ms
        renderTime: Math.random() * 100 + 50, // 50-150ms
        memoryUsage: Math.random() * 50 + 10, // 10-60MB
        errorCount: Math.floor(Math.random() * 3), // 0-2 errors
        lastUpdate: new Date()
      })
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return <CheckCircle className="w-4 h-4" />
    if (value <= thresholds.warning) return <AlertTriangle className="w-4 h-4" />
    return <AlertTriangle className="w-4 h-4" />
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show Performance Monitor"
      >
        <Activity className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 z-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Load Time</span>
          </div>
          <div className={`flex items-center space-x-1 ${getStatusColor(metrics.loadTime, { good: 800, warning: 1200 })}`}>
            {getStatusIcon(metrics.loadTime, { good: 800, warning: 1200 })}
            <span className="text-sm font-medium">{metrics.loadTime.toFixed(0)}ms</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Render Time</span>
          </div>
          <div className={`flex items-center space-x-1 ${getStatusColor(metrics.renderTime, { good: 100, warning: 150 })}`}>
            {getStatusIcon(metrics.renderTime, { good: 100, warning: 150 })}
            <span className="text-sm font-medium">{metrics.renderTime.toFixed(0)}ms</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Memory Usage</span>
          </div>
          <div className={`flex items-center space-x-1 ${getStatusColor(metrics.memoryUsage, { good: 30, warning: 50 })}`}>
            {getStatusIcon(metrics.memoryUsage, { good: 30, warning: 50 })}
            <span className="text-sm font-medium">{metrics.memoryUsage.toFixed(1)}MB</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Errors</span>
          </div>
          <div className={`flex items-center space-x-1 ${metrics.errorCount === 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.errorCount === 0 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="text-sm font-medium">{metrics.errorCount}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Last updated: {metrics.lastUpdate.toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}