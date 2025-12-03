import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type CalendarView = 'month' | 'week' | 'day' | 'agenda'

/**
 * Get Calendar Data
 * Returns appointments formatted for different calendar views
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

    // Get query params
    const { searchParams } = request.nextUrl
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const view = (searchParams.get('view') || 'month') as CalendarView

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)

    // Fetch business services
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('services')
      .eq('id', businessId)
      .single()

    const businessServices = business?.services || []

    // Fetch appointments
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
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

    // Format response based on view
    let responseData: any

    switch (view) {
      case 'month': {
        // Group by date
        const daysMap = new Map<string, any[]>()
        appointments?.forEach(apt => {
          const dateStr = apt.scheduled_date
          if (!daysMap.has(dateStr)) {
            daysMap.set(dateStr, [])
          }
          daysMap.get(dateStr)!.push({
            id: apt.id,
            customer_name: apt.customer_name,
            service_type: apt.service_type,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status
          })
        })

        const days = Array.from(daysMap.entries()).map(([date, appointments]) => ({
          date,
          appointments
        }))

        responseData = { days }
        break
      }

      case 'week': {
        // Group by day and time slots
        const daysMap = new Map<string, Map<string, any[]>>()
        
        appointments?.forEach(apt => {
          const dateStr = apt.scheduled_date
          const startTime = new Date(apt.start_time)
          const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`

          if (!daysMap.has(dateStr)) {
            daysMap.set(dateStr, new Map())
          }
          const slotsMap = daysMap.get(dateStr)!
          if (!slotsMap.has(timeStr)) {
            slotsMap.set(timeStr, [])
          }
          slotsMap.get(timeStr)!.push({
            id: apt.id,
            customer_name: apt.customer_name,
            service_type: apt.service_type,
            start_time: apt.start_time,
            end_time: apt.end_time,
            duration: apt.duration,
            status: apt.status
          })
        })

        const days = Array.from(daysMap.entries()).map(([date, slotsMap]) => ({
          date,
          slots: Array.from(slotsMap.entries()).map(([time, appointments]) => ({
            time,
            appointments
          }))
        }))

        responseData = { days }
        break
      }

      case 'day': {
        // Single day with time slots
        const slotsMap = new Map<string, any[]>()
        
        appointments?.forEach(apt => {
          const startTime = new Date(apt.start_time)
          const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`

          if (!slotsMap.has(timeStr)) {
            slotsMap.set(timeStr, [])
          }
          slotsMap.get(timeStr)!.push({
            id: apt.id,
            customer_name: apt.customer_name,
            service_type: apt.service_type,
            start_time: apt.start_time,
            end_time: apt.end_time,
            duration: apt.duration,
            status: apt.status
          })
        })

        const slots = Array.from(slotsMap.entries()).map(([time, appointments]) => ({
          time,
          appointments
        }))

        responseData = {
          date: startDateParam,
          slots
        }
        break
      }

      case 'agenda': {
        // List format
        responseData = {
          appointments: appointments?.map(apt => ({
            id: apt.id,
            scheduled_date: apt.scheduled_date,
            start_time: apt.start_time,
            end_time: apt.end_time,
            customer_name: apt.customer_name,
            service_type: apt.service_type,
            status: apt.status,
            estimated_value: apt.estimated_value,
            address: apt.address,
            notes: apt.notes
          })) || []
        }
        break
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid view. Must be month, week, day, or agenda' },
          { status: 400 }
        )
    }

    // Log response size for debugging
    const finalResponse = {
      success: true,
      view,
      ...responseData,
      businessServices
    }
    
    logger.info('Calendar API response', {
      businessId,
      view,
      startDate: startDateParam,
      endDate: endDateParam,
      appointmentCount: appointments?.length || 0,
      responseSize: JSON.stringify(finalResponse).length
    })

    return NextResponse.json(finalResponse, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        ...rateLimitResult.headers
      }
    })
  } catch (error) {
    logger.error('Error fetching calendar data', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar data' },
      { status: 500 }
    )
  }
}

