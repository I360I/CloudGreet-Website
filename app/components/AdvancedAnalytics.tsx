'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react'

interface AnalyticsData {
  calls: {
    daily: Array<{ date: string; calls: number; bookings: number; revenue: number }>
    weekly: Array<{ week: string; calls: number; bookings: number; revenue: number }>
    monthly: Array<{ month: string; calls: number; bookings: number; revenue: number }>
  }
  performance: {
    answerRate: number
    conversionRate: number
    avgCallDuration: number
    customerSatisfaction: number
  }
  revenue: {
    total: number
    growth: number
    breakdown: Array<{ source: string; amount: number; percentage: number }>
  }
  aiMetrics: {
    sentiment: Array<{ sentiment: string; count: number; percentage: number }>
    topics: Array<{ topic: string; frequency: number }>
    responseTime: number
  }
}

export default function AdvancedAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const colors = {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4'
  }

  const pieColors = [colors.primary, colors.secondary, colors.success, colors.warning, colors.danger]

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    setIsLoading(true)
    try {
      // Simulate API call with realistic data
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockData: AnalyticsData = {
        calls: {
          daily: generateDailyData(timeRange),
          weekly: generateWeeklyData(timeRange),
          monthly: generateMonthlyData(timeRange)
        },
        performance: {
          answerRate: 94.2,
          conversionRate: 67.8,
          avgCallDuration: 3.2,
          customerSatisfaction: 4.6
        },
        revenue: {
          total: 125400,
          growth: 23.5,
          breakdown: [
            { source: 'HVAC Services', amount: 45600, percentage: 36.4 },
            { source: 'Painting Jobs', amount: 38900, percentage: 31.0 },
            { source: 'Roofing Projects', amount: 40900, percentage: 32.6 }
          ]
        },
        aiMetrics: {
          sentiment: [
            { sentiment: 'Positive', count: 156, percentage: 68.4 },
            { sentiment: 'Neutral', count: 52, percentage: 22.8 },
            { sentiment: 'Negative', count: 20, percentage: 8.8 }
          ],
          topics: [
            { topic: 'Service Inquiry', frequency: 89 },
            { topic: 'Pricing', frequency: 67 },
            { topic: 'Scheduling', frequency: 45 },
            { topic: 'Emergency', frequency: 23 },
            { topic: 'Follow-up', frequency: 12 }
          ],
          responseTime: 1.2
        }
      }
      
      setAnalyticsData(mockData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateDailyData = (range: string) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
    const data = []
    const today = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      data.push({
        date: date.toISOString().split('T')[0],
        calls: Math.floor(Math.random() * 20) + 10,
        bookings: Math.floor(Math.random() * 12) + 5,
        revenue: Math.floor(Math.random() * 5000) + 2000
      })
    }
    return data
  }

  const generateWeeklyData = (range: string) => {
    const weeks = range === '7d' ? 1 : range === '30d' ? 4 : range === '90d' ? 12 : 52
    const data = []
    
    for (let i = weeks - 1; i >= 0; i--) {
      data.push({
        week: `Week ${weeks - i}`,
        calls: Math.floor(Math.random() * 100) + 50,
        bookings: Math.floor(Math.random() * 60) + 30,
        revenue: Math.floor(Math.random() * 25000) + 10000
      })
    }
    return data
  }

  const generateMonthlyData = (range: string) => {
    const months = range === '1y' ? 12 : 3
    const data = []
    
    for (let i = months - 1; i >= 0; i--) {
      data.push({
        month: new Date(2024, 11 - i, 1).toLocaleDateString('en-US', { month: 'short' }),
        calls: Math.floor(Math.random() * 400) + 200,
        bookings: Math.floor(Math.random() * 250) + 150,
        revenue: Math.floor(Math.random() * 100000) + 50000
      })
    }
    return data
  }

  const exportData = () => {
    if (!analyticsData) return
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Calls,Bookings,Revenue\n" +
      analyticsData.calls.daily.map(d => `${d.date},${d.calls},${d.bookings},${d.revenue}`).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Advanced Analytics</h2>
          <div className="flex items-center space-x-4">
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-32 rounded-lg"></div>
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-24 rounded-lg"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-80 rounded-2xl"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <Activity className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Analytics Data</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Start taking calls to see your analytics</p>
        <button
          onClick={fetchAnalyticsData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          Refresh Data
        </button>
      </div>
    )
  }

  const currentData = timeRange === '7d' ? analyticsData.calls.daily : 
                     timeRange === '30d' ? analyticsData.calls.daily :
                     timeRange === '90d' ? analyticsData.calls.weekly : 
                     analyticsData.calls.monthly

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Advanced Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['line', 'area', 'bar'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  chartType === type
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {type === 'line' ? <TrendingUp className="w-4 h-4" /> :
                 type === 'area' ? <BarChart3 className="w-4 h-4" /> :
                 <BarChart3 className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={fetchAnalyticsData}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={exportData}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Answer Rate</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{analyticsData.performance.answerRate}%</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +2.1% from last period
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-green-50 dark:from-slate-800 dark:to-green-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Conversion Rate</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{analyticsData.performance.conversionRate}%</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +5.3% from last period
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-purple-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Call Duration</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{analyticsData.performance.avgCallDuration}m</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Optimal range: 2-4 minutes
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-orange-900/20 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Customer Satisfaction</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{analyticsData.performance.customerSatisfaction}/5</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +0.3 from last period
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Performance Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Performance Trends</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-slate-600 dark:text-slate-400">Calls</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-slate-600 dark:text-slate-400">Bookings</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-slate-600 dark:text-slate-400">Revenue</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey={timeRange === '1y' ? 'month' : 'date'} stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#F1F5F9'
                    }} 
                  />
                  <Line type="monotone" dataKey="calls" stroke={colors.primary} strokeWidth={3} />
                  <Line type="monotone" dataKey="bookings" stroke={colors.success} strokeWidth={3} />
                  <Line type="monotone" dataKey="revenue" stroke={colors.secondary} strokeWidth={3} />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey={timeRange === '1y' ? 'month' : 'date'} stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#F1F5F9'
                    }} 
                  />
                  <Area type="monotone" dataKey="calls" stackId="1" stroke={colors.primary} fill={colors.primary} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="bookings" stackId="2" stroke={colors.success} fill={colors.success} fillOpacity={0.6} />
                </AreaChart>
              ) : (
                <BarChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey={timeRange === '1y' ? 'month' : 'date'} stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#F1F5F9'
                    }} 
                  />
                  <Bar dataKey="calls" fill={colors.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bookings" fill={colors.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Revenue Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.revenue.breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="amount"
                >
                  {analyticsData.revenue.breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#F1F5F9'
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {analyticsData.revenue.breakdown.map((item, index) => (
              <div key={item.source} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  ></div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">{item.source}</span>
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Sentiment Analysis */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">AI Sentiment Analysis</h3>
          <div className="space-y-4">
            {analyticsData.aiMetrics.sentiment.map((sentiment, index) => (
              <div key={sentiment.sentiment} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  ></div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {sentiment.sentiment}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${sentiment.percentage}%`,
                        backgroundColor: pieColors[index % pieColors.length]
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 w-12 text-right">
                    {sentiment.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Avg Response Time</span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">
                {analyticsData.aiMetrics.responseTime}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Topics */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Top Conversation Topics</h3>
        <div className="space-y-3">
          {analyticsData.aiMetrics.topics.map((topic, index) => (
            <div key={topic.topic} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  {index + 1}
                </div>
                <span className="text-slate-900 dark:text-white font-medium">{topic.topic}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" 
                    style={{ width: `${(topic.frequency / Math.max(...analyticsData.aiMetrics.topics.map(t => t.frequency))) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400 w-8 text-right">
                  {topic.frequency}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
