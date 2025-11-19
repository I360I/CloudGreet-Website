'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, RefreshCw, CheckCircle2, AlertCircle, XCircle, Clock, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useToast } from '@/app/contexts/ToastContext'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down' | 'not_configured'
  response_time_ms: number
  error?: string
  last_checked: string
  metadata?: Record<string, any>
}

interface HealthResponse {
  timestamp: string
  overall_status: 'healthy' | 'degraded' | 'down'
  health_score: number
  checks: Record<string, HealthCheck>
  metrics: {
    active_businesses: number
    active_subscriptions: number
    failed_jobs: number
  }
  cached?: boolean
}

interface HistoricalData {
  timestamp: string
  health_score: number
}

export default function AdminHealthPage() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([])
  const [loading, setLoading] = useState(true)
  const [runningTests, setRunningTests] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { showSuccess, showError } = useToast()

  const fetchHealthData = useCallback(async (force: boolean = false) => {
    try {
      const url = force ? '/api/admin/health?force=true' : '/api/admin/health'
      const response = await fetchWithAuth(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: HealthResponse = await response.json()
      setHealthData(data)
      setLastUpdated(new Date())

      // Fetch historical data for chart
      if (!force) {
        fetchHistoricalData()
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error)
      showError('Failed to fetch health data', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [showError])

  const fetchHistoricalData = async () => {
    try {
      // Fetch last 24 hours of health checks from database
      const response = await fetchWithAuth('/api/admin/health/history?hours=24')
      if (response.ok) {
        const data = await response.json()
        setHistoricalData(data.history || [])
      }
    } catch (error) {
      // Historical data is optional, fail silently
      console.warn('Failed to fetch historical data:', error)
    }
  }

  const runTestsNow = async () => {
    setRunningTests(true)
    try {
      const response = await fetchWithAuth('/api/admin/health', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: HealthResponse = await response.json()
      setHealthData(data)
      setLastUpdated(new Date())
      showSuccess('Health checks completed', `Overall status: ${data.overall_status}`)
    } catch (error) {
      showError('Failed to run health checks', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setRunningTests(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchHealthData()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchHealthData])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-200 bg-green-50'
      case 'degraded':
        return 'border-yellow-200 bg-yellow-50'
      case 'down':
        return 'border-red-200 bg-red-50'
      case 'not_configured':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'down':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'not_configured':
        return <Minus className="w-5 h-5 text-gray-400" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatServiceName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Prepare chart data
  const chartData = {
    labels: historicalData.map(d => {
      const date = new Date(d.timestamp)
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }),
    datasets: [
      {
        label: 'Health Score',
        data: historicalData.map(d => d.health_score),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(147, 51, 234)'
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgb(147, 51, 234)',
        bodyColor: '#fff',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(147, 51, 234, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(147, 51, 234, 0.1)'
        }
      }
    }
  }

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <div className="text-gray-600 text-lg">Loading health status...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-500" />
              System Health
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time monitoring of all critical services and infrastructure
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={() => fetchHealthData(true)}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={runTestsNow}
              disabled={runningTests}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded"
            >
              {runningTests ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Run Tests Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Health Score */}
        {healthData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="col-span-1 md:col-span-2 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Overall Health</h2>
                {healthData.overall_status === 'healthy' && <TrendingUp className="w-5 h-5 text-green-600" />}
                {healthData.overall_status === 'degraded' && <TrendingDown className="w-5 h-5 text-yellow-600" />}
                {healthData.overall_status === 'down' && <TrendingDown className="w-5 h-5 text-red-600" />}
              </div>
              <div className={`text-3xl md:text-4xl lg:text-5xl font-bold leading-tight ${getHealthScoreColor(healthData.health_score)}`}>
                {healthData.health_score}%
              </div>
              <div className="text-gray-600 mt-2">
                Status: <span className="capitalize font-semibold text-gray-900">{healthData.overall_status}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-sm text-gray-600 mb-2">Active Businesses</h3>
              <div className="text-3xl font-bold text-gray-900">{healthData.metrics.active_businesses}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-sm text-gray-600 mb-2">Active Subscriptions</h3>
              <div className="text-3xl font-bold text-gray-900">{healthData.metrics.active_subscriptions}</div>
            </div>
          </div>
        )}

        {/* Historical Chart */}
        {historicalData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Score Trend (Last 24 Hours)</h2>
            <div className="h-64">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Service Status Cards */}
        {healthData && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(healthData.checks).map(([serviceName, check]) => (
                <div
                  key={serviceName}
                  className={`bg-white border-2 rounded-lg p-4 shadow-sm ${getStatusColor(check.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{formatServiceName(serviceName)}</h3>
                    {getStatusIcon(check.status)}
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="capitalize font-medium">{check.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response Time:</span>
                      <span className="font-medium">{formatResponseTime(check.response_time_ms)}</span>
                    </div>
                    {check.error && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                        {check.error}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(check.last_checked).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Jobs Alert */}
        {healthData && healthData.metrics.failed_jobs > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Warning: {healthData.metrics.failed_jobs} failed background jobs</span>
            </div>
          </div>
        )}
    </div>
  )
}

