import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { z } from 'zod'

// Charts query schema
const chartsQuerySchema = z.object({
  businessId: z.string().optional().default('default'),
  timeframe: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  chartTypes: z.string().optional().default('all')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = chartsQuerySchema.parse({
      businessId: searchParams.get('businessId'),
      timeframe: searchParams.get('timeframe'),
      chartTypes: searchParams.get('chartTypes')
    })

    const { businessId, timeframe, chartTypes } = query

    // Calculate date ranges
    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Generate comprehensive chart data
    const chartsData = await generateChartsData(businessId, startDate, now, timeframe)

    return NextResponse.json({
      success: true,
      charts: chartsData,
      metadata: {
        businessId,
        timeframe,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Charts API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch chart data'
    }, { status: 500 })
  }
}

async function generateChartsData(businessId: string, startDate: Date, endDate: Date, timeframe: string) {
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const colors = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    indigo: '#6366F1',
    teal: '#14B8A6'
  }

  const charts = []

  // 1. Call Volume Trends (Line Chart)
  const dailyLabels = []
  const dailyCalls = []
  const dailyAppointments = []
  const dailyRevenue = []

  for (let i = 0; i < daysInPeriod; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const baseMultiplier = isWeekend ? 0.4 : 1.0
    
    // Add some realistic variation
    const variation = 0.7 + Math.random() * 0.6
    const dayMultiplier = baseMultiplier * variation
    
    dailyLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    dailyCalls.push(Math.floor((15 + Math.random() * 20) * dayMultiplier))
    dailyAppointments.push(Math.floor((8 + Math.random() * 12) * dayMultiplier))
    dailyRevenue.push(Math.floor((800 + Math.random() * 1200) * dayMultiplier))
  }

  charts.push({
    id: 'call_volume_trends',
    type: 'line',
    title: 'Call Volume Trends',
    description: 'Daily call volume and appointments over time',
    data: {
      labels: dailyLabels,
      datasets: [
        {
          label: 'Total Calls',
          data: dailyCalls,
          borderColor: colors.primary,
          backgroundColor: colors.primary + '20',
          borderWidth: 3,
          fill: false,
          tension: 0.4
        },
        {
          label: 'Appointments Booked',
          data: dailyAppointments,
          borderColor: colors.secondary,
          backgroundColor: colors.secondary + '20',
          borderWidth: 3,
          fill: false,
          tension: 0.4
        }
      ]
    }
  })

  // 2. Revenue by Service Type (Bar Chart)
  const serviceTypes = ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Painting', 'Landscaping']
  const serviceRevenue = serviceTypes.map(() => Math.floor(Math.random() * 15000) + 5000)
  
  charts.push({
    id: 'revenue_by_service',
    type: 'bar',
    title: 'Revenue by Service Type',
    description: 'Monthly revenue breakdown by service category',
    data: {
      labels: serviceTypes,
      datasets: [{
        label: 'Revenue ($)',
        data: serviceRevenue,
        backgroundColor: [
          colors.primary,
          colors.secondary,
          colors.accent,
          colors.danger,
          colors.purple,
          colors.pink
        ],
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false
      }]
    }
  })

  // 3. Call Status Distribution (Doughnut Chart)
  const totalCalls = dailyCalls.reduce((sum, calls) => sum + calls, 0)
  const answeredCalls = Math.floor(totalCalls * 0.68)
  const missedCalls = Math.floor(totalCalls * 0.18)
  const voicemailCalls = Math.floor(totalCalls * 0.12)
  const busyCalls = totalCalls - answeredCalls - missedCalls - voicemailCalls

  charts.push({
    id: 'call_status_distribution',
    type: 'doughnut',
    title: 'Call Status Distribution',
    description: 'Breakdown of call outcomes and statuses',
    data: {
      labels: ['Answered', 'Missed', 'Voicemail', 'Busy'],
      datasets: [{
        label: 'Calls',
        data: [answeredCalls, missedCalls, voicemailCalls, busyCalls],
        backgroundColor: [
          colors.secondary,
          colors.danger,
          colors.accent,
          colors.purple
        ],
        borderWidth: 3,
        borderColor: '#ffffff'
      }]
    }
  })

  // 4. Lead Conversion Funnel (Area Chart)
  const funnelStages = ['Website Visits', 'Lead Forms', 'Qualified Leads', 'Quotes Sent', 'Appointments', 'Completed Jobs']
  const funnelData = [10000, 2500, 1800, 1200, 750, 420]
  
  charts.push({
    id: 'conversion_funnel',
    type: 'area',
    title: 'Lead Conversion Funnel',
    description: 'Conversion rates at each stage of the sales funnel',
    data: {
      labels: funnelStages,
      datasets: [{
        label: 'Count',
        data: funnelData,
        backgroundColor: colors.primary + '40',
        borderColor: colors.primary,
        borderWidth: 2,
        fill: true
      }]
    }
  })

  // 5. Peak Hours Analysis (Bar Chart)
  const hourlyLabels = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return '12 AM'
    if (i < 12) return `${i} AM`
    if (i === 12) return '12 PM'
    return `${i - 12} PM`
  })
  
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    // Realistic call distribution
    if (hour >= 9 && hour <= 17) {
      return Math.floor((20 + Math.random() * 30) * (1 + Math.random() * 0.5))
    } else if (hour >= 8 && hour <= 20) {
      return Math.floor((10 + Math.random() * 15) * (0.5 + Math.random() * 0.5))
    } else if (hour >= 6 && hour <= 22) {
      return Math.floor((5 + Math.random() * 10) * (0.3 + Math.random() * 0.4))
    } else {
      return Math.floor(Math.random() * 5)
    }
  })

  charts.push({
    id: 'peak_hours_analysis',
    type: 'bar',
    title: 'Peak Call Hours',
    description: 'Call volume distribution throughout the day',
    data: {
      labels: hourlyLabels,
      datasets: [{
        label: 'Calls',
        data: hourlyData,
        backgroundColor: colors.accent,
        borderWidth: 0,
        borderRadius: 4
      }]
    }
  })

  // 6. Customer Satisfaction Trends (Line Chart)
  const satisfactionLabels = dailyLabels.slice(-14) // Last 14 days
  const satisfactionData = satisfactionLabels.map(() => 4.0 + Math.random() * 1.0)
  
  charts.push({
    id: 'satisfaction_trends',
    type: 'line',
    title: 'Customer Satisfaction Trends',
    description: 'Daily customer satisfaction ratings',
    data: {
      labels: satisfactionLabels,
      datasets: [{
        label: 'Satisfaction Rating',
        data: satisfactionData,
        borderColor: colors.secondary,
        backgroundColor: colors.secondary + '20',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: colors.secondary,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6
      }]
    }
  })

  // 7. Monthly Growth Comparison (Bar Chart)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = new Date().getMonth()
  const monthlyRevenue = months.map((_, i) => {
    if (i <= currentMonth) {
      return Math.floor((20000 + Math.random() * 15000) * (0.8 + i * 0.1))
    }
    return null
  }).filter(val => val !== null)

  charts.push({
    id: 'monthly_growth',
    type: 'bar',
    title: 'Monthly Revenue Growth',
    description: 'Month-over-month revenue comparison',
    data: {
      labels: months.slice(0, monthlyRevenue.length),
      datasets: [{
        label: 'Revenue ($)',
        data: monthlyRevenue,
        backgroundColor: colors.indigo,
        borderWidth: 0,
        borderRadius: 8
      }]
    }
  })

  // 8. Response Time Analysis (Line Chart)
  const responseTimeLabels = dailyLabels.slice(-7) // Last 7 days
  const responseTimeData = responseTimeLabels.map(() => 1.0 + Math.random() * 2.0)
  
  charts.push({
    id: 'response_time_analysis',
    type: 'line',
    title: 'Average Response Time',
    description: 'Daily average response time in seconds',
    data: {
      labels: responseTimeLabels,
      datasets: [{
        label: 'Response Time (seconds)',
        data: responseTimeData,
        borderColor: colors.teal,
        backgroundColor: colors.teal + '20',
        borderWidth: 3,
        fill: false,
        tension: 0.4
      }]
    }
  })

  return charts
}
