'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Phone,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Target,
  Activity,
  PieChart,
  LineChart,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Star,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('calls')

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/analytics/advanced?range=${timeRange}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setAnalyticsData(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Activity className="w-4 h-4 text-slate-500" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600 dark:text-green-400'
    if (trend < 0) return 'text-red-600 dark:text-red-400'
    return 'text-slate-600 dark:text-slate-400'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400">Performance insights and metrics</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>

              <button
                onClick={fetchAnalyticsData}
                className="p-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Calls */}
          <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/20 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Calls</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {analyticsData?.calls?.total || 0}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(analyticsData?.calls?.trend || 0)}
                  <span className={`text-sm font-medium ${getTrendColor(analyticsData?.calls?.trend || 0)}`}>
                    {formatPercentage(Math.abs(analyticsData?.calls?.trend || 0))}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-gradient-to-br from-white to-green-50 dark:from-slate-800 dark:to-green-900/20 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Conversion Rate</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatPercentage(analyticsData?.conversion?.rate || 0)}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(analyticsData?.conversion?.trend || 0)}
                  <span className={`text-sm font-medium ${getTrendColor(analyticsData?.conversion?.trend || 0)}`}>
                    {formatPercentage(Math.abs(analyticsData?.conversion?.trend || 0))}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Revenue Generated */}
          <div className="bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Revenue Generated</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(analyticsData?.revenue?.total || 0)}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(analyticsData?.revenue?.trend || 0)}
                  <span className={`text-sm font-medium ${getTrendColor(analyticsData?.revenue?.trend || 0)}`}>
                    {formatPercentage(Math.abs(analyticsData?.revenue?.trend || 0))}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* AI Performance */}
          <div className="bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-orange-900/20 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">AI Performance</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatPercentage(analyticsData?.ai?.performance || 0)}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(analyticsData?.ai?.trend || 0)}
                  <span className={`text-sm font-medium ${getTrendColor(analyticsData?.ai?.trend || 0)}`}>
                    {formatPercentage(Math.abs(analyticsData?.ai?.trend || 0))}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Call Volume Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Call Volume Trend</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">Calls</span>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <LineChart className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Chart visualization coming soon</p>
              </div>
            </div>
          </div>

          {/* Call Outcomes */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Call Outcomes</h3>
              <PieChart className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-slate-700 dark:text-slate-300">Successful Bookings</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {analyticsData?.outcomes?.bookings || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-700 dark:text-slate-300">Information Requests</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {analyticsData?.outcomes?.info || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-slate-700 dark:text-slate-300">Callbacks Requested</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {analyticsData?.outcomes?.callbacks || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-slate-700 dark:text-slate-300">Spam/Unqualified</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {analyticsData?.outcomes?.spam || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Performance Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-semibold text-green-900 dark:text-green-100">Peak Performance</h4>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your AI is performing at {formatPercentage(analyticsData?.ai?.performance || 0)} efficiency
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Average Response</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {analyticsData?.responseTime || '0.2'}s average response time
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <h4 className="font-semibold text-purple-900 dark:text-purple-100">Growth Trend</h4>
              <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                {formatPercentage(analyticsData?.growth || 0)} increase in bookings
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}