'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { TrendingUp, Phone, Calendar, DollarSign } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface RealChartsProps {
  businessId?: string
  timeframe?: '7d' | '30d' | '90d'
}

export default function RealCharts({ businessId, timeframe = '30d' }: RealChartsProps) {
  const [chartData, setChartData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRealChartData()
  }, [businessId, timeframe])

  const loadRealChartData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch real chart data with automatic authentication
      const response = await fetchWithAuth(`/api/dashboard/real-charts?timeframe=${timeframe}`)

      if (response.ok) {
        const data = await response.json()
        setChartData(data.charts)
      } else {
        setError('Failed to load chart data')
      }
    } catch (error) {
      console.error('Error loading chart data:', error)
      setError('Error loading chart data')
    } finally {
      setLoading(false)
    }
  }

  const chartOptions: unknown = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9CA3AF'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#374151',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9CA3AF'
        },
        grid: {
          color: '#374151'
        }
      },
      y: {
        ticks: {
          color: '#9CA3AF'
        },
        grid: {
          color: '#374151'
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-gray-700/50 rounded w-32 mb-4"></div>
            <div className="h-64 bg-gray-700/50 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !chartData) {
    return (
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-400">Charts Unavailable</h3>
            <p className="text-red-300 text-sm">{error || 'No data available'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold">Revenue Trend</h3>
        </div>
        <div className="h-64">
          <Line data={(chartData as any)?.revenueData} options={chartOptions} />
        </div>
      </motion.div>

      {/* Calls Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold">Call Volume</h3>
        </div>
        <div className="h-64">
          <Bar data={(chartData as any)?.callData} options={chartOptions} />
        </div>
      </motion.div>

      {/* Conversion Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold">Call Outcomes</h3>
        </div>
        <div className="h-64">
          <Doughnut data={(chartData as any)?.conversionData} options={chartOptions} />
        </div>
      </motion.div>
    </div>
  )
}
