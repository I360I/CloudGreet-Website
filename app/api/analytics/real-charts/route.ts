import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const chartType = searchParams.get('chartType') || 'calls_over_time'
    const timeframe = searchParams.get('timeframe') || '30d'

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Get real chart data based on type
    let chartData
    switch (chartType) {
      case 'calls_over_time':
        chartData = await getCallsOverTimeData(businessId, timeframe)
        break
      case 'revenue_trends':
        chartData = await getRevenueTrendsData(businessId, timeframe)
        break
      case 'conversion_rates':
        chartData = await getConversionRatesData(businessId, timeframe)
        break
      case 'customer_satisfaction':
        chartData = await getCustomerSatisfactionData(businessId, timeframe)
        break
      case 'call_volume_by_hour':
        chartData = await getCallVolumeByHourData(businessId, timeframe)
        break
      case 'appointment_bookings':
        chartData = await getAppointmentBookingsData(businessId, timeframe)
        break
      case 'revenue_by_service':
        chartData = await getRevenueByServiceData(businessId, timeframe)
        break
      default:
        return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      chartType,
      timeframe,
      data: chartData,
      lastUpdated: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error('Real charts error', { 
      error: error.message,
      businessId: request.url.includes('businessId') ? new URL(request.url).searchParams.get('businessId') : 'unknown',
      chartType: request.url.includes('chartType') ? new URL(request.url).searchParams.get('chartType') : 'unknown'
    })
    
    return NextResponse.json({ 
      error: 'Failed to generate real chart data',
      details: error.message 
    }, { status: 500 })
  }
}

async function getCallsOverTimeData(businessId: string, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

  // Get real call data grouped by day
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('created_at, status, duration')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  // Group calls by date
  const callsByDate = new Map()
  const dates = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000))
    const dateStr = date.toISOString().split('T')[0]
    dates.push(dateStr)
    callsByDate.set(dateStr, {
      date: dateStr,
      totalCalls: 0,
      answeredCalls: 0,
      missedCalls: 0,
      avgDuration: 0
    })
  }

  // Process real call data
  calls?.forEach(call => {
    const dateStr = call.created_at.split('T')[0]
    if (callsByDate.has(dateStr)) {
      const dayData = callsByDate.get(dateStr)
      dayData.totalCalls++
      
      if (call.status === 'answered' || call.status === 'completed') {
        dayData.answeredCalls++
      } else if (call.status === 'missed') {
        dayData.missedCalls++
      }
      
      if (call.duration) {
        dayData.avgDuration = (dayData.avgDuration + call.duration) / 2
      }
    }
  })

  return {
    type: 'line',
    title: 'Calls Over Time',
    data: Array.from(callsByDate.values()),
    metrics: {
      totalCalls: calls?.length || 0,
      answeredCalls: calls?.filter(c => c.status === 'answered' || c.status === 'completed').length || 0,
      missedCalls: calls?.filter(c => c.status === 'missed').length || 0,
      avgDuration: calls?.length > 0 ? calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length : 0
    }
  }
}

async function getRevenueTrendsData(businessId: string, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

  // Get real revenue data
  const { data: revenue } = await supabaseAdmin
    .from('billing_transactions')
    .select('amount, created_at, transaction_type')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  // Group revenue by date
  const revenueByDate = new Map()
  const dates = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000))
    const dateStr = date.toISOString().split('T')[0]
    dates.push(dateStr)
    revenueByDate.set(dateStr, {
      date: dateStr,
      dailyRevenue: 0,
      subscriptionRevenue: 0,
      perBookingRevenue: 0,
      totalTransactions: 0
    })
  }

  // Process real revenue data
  revenue?.forEach(transaction => {
    const dateStr = transaction.created_at.split('T')[0]
    if (revenueByDate.has(dateStr)) {
      const dayData = revenueByDate.get(dateStr)
      dayData.dailyRevenue += transaction.amount || 0
      dayData.totalTransactions++
      
      if (transaction.transaction_type === 'subscription') {
        dayData.subscriptionRevenue += transaction.amount || 0
      } else if (transaction.transaction_type === 'per_booking') {
        dayData.perBookingRevenue += transaction.amount || 0
      }
    }
  })

  return {
    type: 'bar',
    title: 'Revenue Trends',
    data: Array.from(revenueByDate.values()),
    metrics: {
      totalRevenue: revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
      avgDailyRevenue: revenue?.length > 0 ? revenue.reduce((sum, r) => sum + (r.amount || 0), 0) / days : 0,
      totalTransactions: revenue?.length || 0
    }
  }
}

async function getConversionRatesData(businessId: string, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

  // Get real conversion data
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('created_at, status')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('created_at, status')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  // Group by week for conversion rates
  const weeks = Math.ceil(days / 7)
  const conversionData = []

  for (let week = 0; week < weeks; week++) {
    const weekStart = new Date(startDate.getTime() + (week * 7 * 24 * 60 * 60 * 1000))
    const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000))
    
    const weekCalls = calls?.filter(call => {
      const callDate = new Date(call.created_at)
      return callDate >= weekStart && callDate < weekEnd
    }) || []

    const weekAppointments = appointments?.filter(apt => {
      const aptDate = new Date(apt.created_at)
      return aptDate >= weekStart && aptDate < weekEnd
    }) || []

    const answeredCalls = weekCalls.filter(call => call.status === 'answered' || call.status === 'completed')
    const conversionRate = answeredCalls.length > 0 ? (weekAppointments.length / answeredCalls.length) * 100 : 0

    conversionData.push({
      week: week + 1,
      totalCalls: weekCalls.length,
      answeredCalls: answeredCalls.length,
      appointments: weekAppointments.length,
      conversionRate: conversionRate
    })
  }

  return {
    type: 'line',
    title: 'Conversion Rates Over Time',
    data: conversionData,
    metrics: {
      avgConversionRate: conversionData.length > 0 ? 
        conversionData.reduce((sum, week) => sum + week.conversionRate, 0) / conversionData.length : 0,
      totalCalls: calls?.length || 0,
      totalAppointments: appointments?.length || 0
    }
  }
}

async function getCustomerSatisfactionData(businessId: string, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

  // Get real satisfaction data
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('created_at, satisfaction_score, sentiment')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .not('satisfaction_score', 'is', null)

  // Group by week
  const weeks = Math.ceil(days / 7)
  const satisfactionData = []

  for (let week = 0; week < weeks; week++) {
    const weekStart = new Date(startDate.getTime() + (week * 7 * 24 * 60 * 60 * 1000))
    const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000))
    
    const weekCalls = calls?.filter(call => {
      const callDate = new Date(call.created_at)
      return callDate >= weekStart && callDate < weekEnd
    }) || []

    const avgSatisfaction = weekCalls.length > 0 ? 
      weekCalls.reduce((sum, call) => sum + (call.satisfaction_score || 4), 0) / weekCalls.length : 4

    const positiveSentiment = weekCalls.filter(call => call.sentiment === 'positive').length
    const sentimentRate = weekCalls.length > 0 ? (positiveSentiment / weekCalls.length) * 100 : 0

    satisfactionData.push({
      week: week + 1,
      avgSatisfaction: avgSatisfaction,
      sentimentRate: sentimentRate,
      totalRatings: weekCalls.length
    })
  }

  return {
    type: 'line',
    title: 'Customer Satisfaction Trends',
    data: satisfactionData,
    metrics: {
      overallSatisfaction: calls?.length > 0 ? 
        calls.reduce((sum, call) => sum + (call.satisfaction_score || 4), 0) / calls.length : 4,
      totalRatings: calls?.length || 0,
      positiveSentimentRate: calls?.length > 0 ? 
        (calls.filter(call => call.sentiment === 'positive').length / calls.length) * 100 : 0
    }
  }
}

async function getCallVolumeByHourData(businessId: string, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

  // Get real call data
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('created_at, status')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  // Group by hour (0-23)
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour: hour,
    calls: 0,
    answeredCalls: 0,
    missedCalls: 0
  }))

  // Process real call data
  calls?.forEach(call => {
    const callDate = new Date(call.created_at)
    const hour = callDate.getHours()
    
    hourlyData[hour].calls++
    
    if (call.status === 'answered' || call.status === 'completed') {
      hourlyData[hour].answeredCalls++
    } else if (call.status === 'missed') {
      hourlyData[hour].missedCalls++
    }
  })

  return {
    type: 'bar',
    title: 'Call Volume by Hour',
    data: hourlyData,
    metrics: {
      peakHour: hourlyData.reduce((max, hour) => hour.calls > max.calls ? hour : max, hourlyData[0]).hour,
      totalCalls: calls?.length || 0,
      avgCallsPerHour: calls?.length ? calls.length / 24 : 0
    }
  }
}

async function getAppointmentBookingsData(businessId: string, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

  // Get real appointment data
  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('created_at, status, service_type')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  // Group by date
  const appointmentsByDate = new Map()
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000))
    const dateStr = date.toISOString().split('T')[0]
    appointmentsByDate.set(dateStr, {
      date: dateStr,
      totalBookings: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      services: {}
    })
  }

  // Process real appointment data
  appointments?.forEach(appointment => {
    const dateStr = appointment.created_at.split('T')[0]
    if (appointmentsByDate.has(dateStr)) {
      const dayData = appointmentsByDate.get(dateStr)
      dayData.totalBookings++
      
      if (appointment.status === 'completed') {
        dayData.completedAppointments++
      } else if (appointment.status === 'cancelled') {
        dayData.cancelledAppointments++
      }
      
      if (appointment.service_type) {
        dayData.services[appointment.service_type] = (dayData.services[appointment.service_type] || 0) + 1
      }
    }
  })

  return {
    type: 'line',
    title: 'Appointment Bookings Over Time',
    data: Array.from(appointmentsByDate.values()),
    metrics: {
      totalBookings: appointments?.length || 0,
      completedAppointments: appointments?.filter(apt => apt.status === 'completed').length || 0,
      cancelledAppointments: appointments?.filter(apt => apt.status === 'cancelled').length || 0,
      completionRate: appointments?.length > 0 ? 
        (appointments.filter(apt => apt.status === 'completed').length / appointments.length) * 100 : 0
    }
  }
}

async function getRevenueByServiceData(businessId: string, timeframe: string) {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

  // Get real revenue and service data
  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('service_type, status, created_at')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  const { data: revenue } = await supabaseAdmin
    .from('billing_transactions')
    .select('amount, created_at, appointment_id')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())

  // Group by service type
  const serviceRevenue = new Map()

  appointments?.forEach(appointment => {
    if (appointment.service_type && !serviceRevenue.has(appointment.service_type)) {
      serviceRevenue.set(appointment.service_type, {
        service: appointment.service_type,
        appointments: 0,
        revenue: 0,
        avgRevenue: 0
      })
    }
    
    if (appointment.service_type) {
      const serviceData = serviceRevenue.get(appointment.service_type)
      serviceData.appointments++
    }
  })

  // Add revenue data
  revenue?.forEach(transaction => {
    // Find associated appointment
    const appointment = appointments?.find(apt => apt.created_at === transaction.created_at)
    if (appointment?.service_type && serviceRevenue.has(appointment.service_type)) {
      const serviceData = serviceRevenue.get(appointment.service_type)
      serviceData.revenue += transaction.amount || 0
    }
  })

  // Calculate averages
  serviceRevenue.forEach(serviceData => {
    serviceData.avgRevenue = serviceData.appointments > 0 ? serviceData.revenue / serviceData.appointments : 0
  })

  return {
    type: 'pie',
    title: 'Revenue by Service Type',
    data: Array.from(serviceRevenue.values()),
    metrics: {
      totalRevenue: revenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0,
      totalServices: serviceRevenue.size,
      topService: Array.from(serviceRevenue.values()).reduce((max, service) => 
        service.revenue > max.revenue ? service : max, Array.from(serviceRevenue.values())[0] || { service: 'None', revenue: 0 })
    }
  }
}
