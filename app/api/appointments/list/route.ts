import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const upcoming = searchParams.get('upcoming') === 'true'

    // Build query
    let query = supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('scheduled_date', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter for upcoming appointments if requested
    if (upcoming) {
      const now = new Date().toISOString()
      query = query.gte('scheduled_date', now)
    }

    const { data: appointments, error: appointmentsError } = await query

    if (appointmentsError) {
      logger.error('Error fetching appointments', { 
        error: appointmentsError,  
        businessId, 
        userId 
      })
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    if (upcoming) {
      const now = new Date().toISOString()
      countQuery = countQuery.gte('scheduled_date', now)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      logger.error('Error fetching appointment count', { 
        error: countError,  
        businessId 
      })
    }

    // Format the response
    const formattedAppointments = appointments?.map(appointment => ({
      id: appointment.id,
      customer_name: appointment.customer_name,
      customer_phone: appointment.customer_phone,
      customer_email: appointment.customer_email,
      service: appointment.service,
      scheduled_date: appointment.scheduled_date,
      status: appointment.status,
      estimated_value: appointment.estimated_value,
      address: appointment.address,
      notes: appointment.notes,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at
    })) || []

    return NextResponse.json({
      success: true,
      appointments: formattedAppointments,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    logger.error('Appointments list API error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id')
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const businessId = request.headers.get('x-business-id')
    
    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.customer_name || !body.customer_phone || !body.service || !body.scheduled_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: customer_name, customer_phone, service, scheduled_date' 
      }, { status: 400 })
    }

    // Create new appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: businessId,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_email: body.customer_email,
        service: body.service,
        scheduled_date: body.scheduled_date,
        status: body.status || 'scheduled',
        estimated_value: body.estimated_value || 0,
        address: body.address,
        notes: body.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (appointmentError) {
      logger.error('Error creating appointment', { 
        error: appointmentError,  
        businessId, 
        userId 
      })
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
    }

    // Send notification about new appointment booking
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'client_booking',
          message: `New appointment: ${body.customer_name} - ${body.service} on ${new Date(body.scheduled_date).toLocaleDateString()}`,
          businessId: businessId,
          priority: 'normal'
        })
      })
    } catch (error) {
      console.log('Failed to send appointment notification:', error)
    }

    logger.info('Appointment created successfully', {
      appointmentId: appointment.id,
      businessId,
      userId,
      customerName: body.customer_name
    })

    return NextResponse.json({
      success: true,
      message: 'Appointment created successfully',
      appointment
    })

  } catch (error) {
    logger.error('Create appointment API error', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      userId: request.headers.get('x-user-id'),
      businessId: request.headers.get('x-business-id')
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
