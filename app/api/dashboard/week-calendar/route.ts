import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get Week Calendar Data
 * Returns appointments for a week with day-by-day breakdown
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await moderateRateLimit(request)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    // Authenticate user
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId || !authResult.businessId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const businessId = authResult.businessId

    // Get date range from query params (default to current week)
    const { searchParams } = request.nextUrl
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const now = new Date()
    const startDate = startDateParam 
      ? new Date(startDateParam)
      : (() => {
          const start = new Date(now)
          start.setDate(start.getDate() - start.getDay()) // Start of week (Sunday)
          start.setHours(0, 0, 0, 0)
          return start
        })()
    
    const endDate = endDateParam
      ? new Date(endDateParam)
      : (() => {
          const end = new Date(startDate)
          end.setDate(end.getDate() + 6) // End of week (Saturday)
          end.setHours(23, 59, 59, 999)
          return end
        })()

    // Fetch business services for color mapping
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('services')
      .eq('id', businessId)
      .single()

    const businessServices = business?.services || []

    // Fetch appointments for the week
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('id, scheduled_date, start_time, end_time, customer_name, service_type, status')
      .eq('business_id', businessId)
      .gte('scheduled_date', startDate.toISOString().split('T')[0])
      .lte('scheduled_date', endDate.toISOString().split('T')[0])
      .order('start_time', { ascending: true })

    if (appointmentsError) {
      logger.error('Failed to fetch appointments', {
        error: appointmentsError instanceof Error ? appointmentsError.message : String(appointmentsError),
        businessId
      })
      return NextResponse.json(
        { success: false, error: 'Failed to fetch appointments' },
        { status: 500 }
      )
    }

    // Group appointments by day
    const daysMap = new Map<string, {
      date: string
      dayName: string
      dayNumber: number
      isToday: boolean
      appointments: Array<{
        id: string
        time: string
        customer: string
        serviceType: string
      }>
      count: number
    }>()

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = new Date().toDateString()

    // Initialize all days in the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()

      daysMap.set(dateStr, {
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        dayNumber: date.getDate(),
        isToday: date.toDateString() === today,
        appointments: [],
        count: 0
      })
    }

    // Populate appointments
    appointments?.forEach(apt => {
      const dateStr = apt.scheduled_date
      const dayData = daysMap.get(dateStr)
      
      if (dayData) {
        // Format time (HH:mm)
        const startTime = new Date(apt.start_time)
        const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`
        
        dayData.appointments.push({
          id: apt.id,
          time: timeStr,
          customer: apt.customer_name,
          serviceType: apt.service_type || 'General'
        })
        dayData.count = dayData.appointments.length
      }
    })

    // Convert map to array and sort by date
    const days = Array.from(daysMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    )

    return NextResponse.json({
      success: true,
      days,
      businessServices
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        ...rateLimitResult.headers
      }
    })
  } catch (error) {
    logger.error('Error fetching week calendar', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch week calendar' },
      { status: 500 }
    )
  }
}

