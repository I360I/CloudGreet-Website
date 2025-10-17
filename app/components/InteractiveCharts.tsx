'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Calendar,
  Phone,
  DollarSign,
  Users,
  Target,
  Download,
  Filter,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react'

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }[]
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area'
  title: string
  description: string
  data: ChartData
  options?: any
}

interface InteractiveChartsProps {
  businessId?: string
  timeframe?: '7d' | '30d' | '90d' | '1y'
  autoRefresh?: boolean
}

export default function InteractiveCharts({ 
  businessId = 'default',
  timeframe = '30d',
  autoRefresh = true
}: InteractiveChartsProps) {
  const [charts, setCharts] = useState<ChartConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [chartFilters, setChartFilters] = useState({
    dateRange: timeframe,
    metric: 'all',
    groupBy: 'day'
  })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [chartPosition, setChartPosition] = useState({ x: 0, y: 0 })

  const chartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Fetch chart data
  const fetchChartData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics/charts?businessId=${businessId}&timeframe=${timeframe}`)
      const result = await response.json()

      if (result.success) {
        setCharts(result.charts)
      } else {
        setError(result.error || 'Failed to fetch chart data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chart data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChartData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchChartData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [businessId, timeframe, autoRefresh])

  // Generate sample chart data for demonstration
  const generateSampleCharts = (): ChartConfig[] => {
    const colors = {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      danger: '#EF4444',
      purple: '#8B5CF6',
      pink: '#EC4899'
    }

    return [
      {
        type: 'line',
        title: 'Call Volume Trends',
        description: 'Daily call volume over time',
        data: {
          labels: Array.from({ length: 30 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (29 - i))
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }),
          datasets: [{
            label: 'Total Calls',
            data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 10),
            borderColor: colors.primary,
            backgroundColor: colors.primary + '20',
            borderWidth: 2
          }]
        }
      },
      {
        type: 'bar',
        title: 'Revenue by Service Type',
        description: 'Monthly revenue breakdown by service category',
        data: {
          labels: ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Painting', 'Landscaping'],
          datasets: [{
            label: 'Revenue ($)',
            data: [12500, 8900, 6700, 15300, 4200, 3100],
            backgroundColor: [
              colors.primary,
              colors.secondary,
              colors.accent,
              colors.danger,
              colors.purple,
              colors.pink
            ],
            borderWidth: 0
          }]
        }
      },
      {
        type: 'doughnut',
        title: 'Call Status Distribution',
        description: 'Breakdown of call outcomes',
        data: {
          labels: ['Answered', 'Missed', 'Voicemail', 'Busy'],
          datasets: [{
            label: 'Calls',
            data: [245, 67, 89, 23],
            backgroundColor: [
              colors.secondary,
              colors.danger,
              colors.accent,
              colors.purple
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        }
      },
      {
        type: 'area',
        title: 'Lead Conversion Funnel',
        description: 'Conversion rates at each stage',
        data: {
          labels: ['Leads', 'Qualified', 'Quoted', 'Scheduled', 'Completed'],
          datasets: [{
            label: 'Count',
            data: [1000, 750, 450, 280, 190],
            backgroundColor: colors.primary + '40',
            borderColor: colors.primary,
            borderWidth: 2
          }]
        }
      }
    ]
  }

  // Use sample data if no real data
  useEffect(() => {
    if (charts.length === 0 && !loading && !error) {
      setCharts(generateSampleCharts())
    }
  }, [charts.length, loading, error])

  const renderChart = (chart: ChartConfig, index: number) => {
    const chartId = `chart-${index}`
    
    return (
      <motion.div
        key={chartId}
        ref={(el) => { chartRefs.current[chartId] = el }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-all ${
          selectedChart === chartId ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => setSelectedChart(selectedChart === chartId ? null : chartId)}
        style={{
          transform: `scale(${selectedChart === chartId ? zoomLevel : 1}) translate(${chartPosition.x}px, ${chartPosition.y}px)`,
          transformOrigin: 'center'
        }}
      >
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{chart.title}</h3>
            <p className="text-sm text-gray-600">{chart.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedChart === chartId && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoomLevel(Math.max(0.5, zoomLevel - 0.1))
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoomLevel(Math.min(2, zoomLevel + 0.1))
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoomLevel(1)
                    setChartPosition({ x: 0, y: 0 })
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                downloadChart(chartId, chart.title)
              }}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chart Content */}
        <div className="h-64 relative">
          {renderChartContent(chart, index)}
        </div>

        {/* Chart Legend */}
        {chart.data.datasets.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chart.data.datasets.map((dataset, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: dataset.backgroundColor as string }}
                />
                <span className="text-sm text-gray-600">{dataset.label}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    )
  }

  const renderChartContent = (chart: ChartConfig, index: number) => {
    // Simple SVG-based chart rendering for demonstration
    // In production, you'd use a proper charting library like Chart.js, D3, or Recharts
    
    switch (chart.type) {
      case 'line':
        return renderLineChart(chart)
      case 'bar':
        return renderBarChart(chart)
      case 'pie':
      case 'doughnut':
        return renderPieChart(chart)
      case 'area':
        return renderAreaChart(chart)
      default:
        return <div className="text-gray-500 text-center">Unsupported chart type</div>
    }
  }

  const renderLineChart = (chart: ChartConfig) => {
    const width = 400
    const height = 200
    const padding = 40
    const data = chart.data.datasets[0].data
    const maxValue = Math.max(...data)
    
    const points = data.map((value, index) => ({
      x: padding + (index * (width - 2 * padding)) / (data.length - 1),
      y: height - padding - (value / maxValue) * (height - 2 * padding)
    }))
    
    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ')
    
    return (
      <svg width="100%" height="100%" viewBox="0 0 400 200">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={height - padding - ratio * (height - 2 * padding)}
              x2={width - padding}
              y2={height - padding - ratio * (height - 2 * padding)}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
            <text
              x={padding - 10}
              y={height - padding - ratio * (height - 2 * padding) + 5}
              fontSize="12"
              fill="#6b7280"
              textAnchor="end"
            >
              {Math.round(maxValue * ratio)}
            </text>
          </g>
        ))}
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
        />
        
        {/* Points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#3B82F6"
          />
        ))}
      </svg>
    )
  }

  const renderBarChart = (chart: ChartConfig) => {
    const width = 400
    const height = 200
    const padding = 40
    const data = chart.data.datasets[0].data
    const labels = chart.data.labels
    const maxValue = Math.max(...data)
    const barWidth = (width - 2 * padding) / data.length * 0.8
    const barSpacing = (width - 2 * padding) / data.length * 0.2
    
    return (
      <svg width="100%" height="100%" viewBox="0 0 400 200">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={height - padding - ratio * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - ratio * (height - 2 * padding)}
            stroke="#f3f4f6"
            strokeWidth="1"
          />
        ))}
        
        {/* Bars */}
        {data.map((value, index) => {
          const barHeight = (value / maxValue) * (height - 2 * padding)
          const x = padding + index * (barWidth + barSpacing) + barSpacing / 2
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={height - padding - barHeight}
                width={barWidth}
                height={barHeight}
                fill={chart.data.datasets[0].backgroundColor as string}
              />
              <text
                x={x + barWidth / 2}
                y={height - padding + 15}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {labels[index]}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  const renderPieChart = (chart: ChartConfig) => {
    const centerX = 200
    const centerY = 100
    const radius = 80
    const data = chart.data.datasets[0].data
    const labels = chart.data.labels
    const total = data.reduce((sum, value) => sum + value, 0)
    
    let currentAngle = 0
    
    return (
      <svg width="100%" height="100%" viewBox="0 0 400 200">
        {data.map((value, index) => {
          const percentage = value / total
          const angle = percentage * 2 * Math.PI
          const startAngle = currentAngle
          const endAngle = currentAngle + angle
          
          const x1 = centerX + radius * Math.cos(startAngle)
          const y1 = centerY + radius * Math.sin(startAngle)
          const x2 = centerX + radius * Math.cos(endAngle)
          const y2 = centerY + radius * Math.sin(endAngle)
          
          const largeArcFlag = angle > Math.PI ? 1 : 0
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ')
          
          currentAngle += angle
          
          return (
            <path
              key={index}
              d={pathData}
              fill={chart.data.datasets[0].backgroundColor as string}
              stroke="#ffffff"
              strokeWidth="2"
            />
          )
        })}
        
        {/* Labels */}
        {data.map((value, index) => {
          const percentage = value / total
          const angle = (currentAngle - data.slice(0, index + 1).reduce((sum, v) => sum + (v / total) * 2 * Math.PI, 0)) + (data[index] / total) * Math.PI
          const labelX = centerX + (radius + 20) * Math.cos(angle)
          const labelY = centerY + (radius + 20) * Math.sin(angle)
          
          return (
            <text
              key={index}
              x={labelX}
              y={labelY}
              fontSize="12"
              fill="#374151"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {labels[index]}
            </text>
          )
        })}
      </svg>
    )
  }

  const renderAreaChart = (chart: ChartConfig) => {
    // Simplified area chart implementation
    return renderLineChart(chart) // For demo purposes, same as line chart
  }

  const downloadChart = (chartId: string, title: string) => {
    // In production, you'd implement actual chart download functionality
    console.log(`Downloading chart: ${title}`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 text-red-500">⚠️</div>
          <div>
            <h3 className="font-semibold text-red-800">Chart Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchChartData}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Interactive Analytics</h2>
          <p className="text-gray-600">Visualize your business performance with interactive charts</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={chartFilters.dateRange}
            onChange={(e) => setChartFilters({ ...chartFilters, dateRange: e.target.value as '7d' | '30d' | '90d' | '1y' })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={fetchChartData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {charts.map((chart, index) => renderChart(chart, index))}
        </AnimatePresence>
      </div>

      {/* Chart Controls (when a chart is selected) */}
      {selectedChart && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-4 shadow-sm border"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Chart Controls</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Zoom:</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-600">{Math.round(zoomLevel * 100)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Position X:</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={chartPosition.x}
                onChange={(e) => setChartPosition({ ...chartPosition, x: parseInt(e.target.value) })}
                className="w-20"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Position Y:</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={chartPosition.y}
                onChange={(e) => setChartPosition({ ...chartPosition, y: parseInt(e.target.value) })}
                className="w-20"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
