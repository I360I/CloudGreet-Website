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
import { useBusinessData } from '@/app/hooks/useBusinessData'

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
  const { theme, getServiceColor } = useBusinessData()
  const [chartData, setChartData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const primaryColor = theme?.primaryColor || '#8b5cf6'
  const secondaryColor = theme?.secondaryColor || '#a78bfa'
  
  // Generate colors from business theme
  const callColor = getServiceColor('Calls') || primaryColor
  const appointmentColor = getServiceColor('Appointments') || secondaryColor
  const revenueColor = '#22c55e' // Keep green for revenue (universal positive)

  // Define chart options BEFORE useMemo to avoid initialization error
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

  // Memoize chart options to prevent re-renders (moved after chartOptions definition)
  const chartOptionsMemo = React.useMemo(() => chartOptions, [primaryColor, callColor, appointmentColor, revenueColor])

  useEffect(() => {
    loadRealChartData()
  }, [businessId, timeframe])

  const loadRealChartData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch real chart data with automatic authentication
      const response = await fetchWithAuth(`/api/dashboard/real-charts?timeframe=${timeframe}`)

      if (!response.ok) {
        setError(`Failed to load chart data (${response.status})`)
        return
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        setError('Invalid response from server')
        return
      }
      setChartData(data.charts)
    } catch (error) {
      console.error('Error loading chart data:', error)
      setError('Error loading chart data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-lg"
          >
            <div className="h-6 bg-white/10 rounded-lg w-32 mb-4 animate-pulse"></div>
            <div className="h-64 bg-white/10 rounded-xl animate-pulse"></div>
          </motion.div>
        ))}
      </div>
    )
  }

  if (error || !chartData) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-xl p-6 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center"
          >
            <TrendingUp className="w-5 h-5 text-red-400" />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-1">Charts Unavailable</h3>
            <p className="text-red-300/80 text-sm">{error || 'No chart data available'}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.01, y: -2 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:border-white/20"
        style={{ 
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <DollarSign className="w-5 h-5" style={{ color: revenueColor }} />
          </motion.div>
          <h3 className="text-lg font-semibold">Revenue Trend</h3>
        </div>
        <motion.div 
          className="h-64"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Line data={(chartData as any)?.revenueData} options={chartOptionsMemo} />
        </motion.div>
      </motion.div>

      {/* Calls Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.01, y: -2 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:border-white/20"
        style={{ 
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Phone className="w-5 h-5" style={{ color: callColor }} />
          </motion.div>
          <h3 className="text-lg font-semibold">Call Volume</h3>
        </div>
        <motion.div 
          className="h-64"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Bar data={(chartData as any)?.callData} options={chartOptionsMemo} />
        </motion.div>
      </motion.div>

      {/* Conversion Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.01, y: -2 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-xl hover:border-white/20"
        style={{ 
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Calendar className="w-5 h-5" style={{ color: appointmentColor }} />
          </motion.div>
          <h3 className="text-lg font-semibold">Call Outcomes</h3>
        </div>
        <motion.div 
          className="h-64"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Doughnut data={(chartData as any)?.conversionData} options={chartOptionsMemo} />
        </motion.div>
      </motion.div>
    </div>
  )
}
