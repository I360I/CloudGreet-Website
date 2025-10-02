import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Database not configured. Please contact support.'
      }, { status: 503 })
    }

    // Get authentication token from Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only-32-chars'
    
    if (!jwtSecret) {
      return NextResponse.json({
        success: false,
        message: 'Server configuration error'
      }, { status: 500 })
    }

    // Decode JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ 
        success: false,
        message: 'Invalid token'
      }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId
    
    if (!userId || !businessId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid token data'
      }, { status: 401 })
    }

    // Fetch appointments from database
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .order('scheduled_date', { ascending: true })

    if (appointmentsError) {
      logger.error("Error fetching appointments", { 
        error: appointmentsError.message, 
        requestId,
        businessId,
        userId,
        action: 'fetch_appointments'
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch appointments'
      }, { status: 500 })
    }

    await logger.info('Appointments fetched successfully', {
      requestId,
      businessId,
      appointmentCount: appointments?.length || 0,
      responseTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      appointments: appointments || [],
      meta: {
        requestId,
        totalAppointments: appointments?.length || 0,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error("Error", { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      requestId,
      endpoint: 'get_appointments',
      responseTime: Date.now() - startTime
    })
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}
