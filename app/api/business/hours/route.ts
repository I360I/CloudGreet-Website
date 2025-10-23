import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get business hours from database
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_hours, timezone')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Return default 24/7 hours if not configured
    const defaultHours = {
      enabled: false, // Default to 24/7
      timezone: business.timezone || 'America/New_York',
      hours: {
        monday: { start: '09:00', end: '17:00', enabled: true },
        tuesday: { start: '09:00', end: '17:00', enabled: true },
        wednesday: { start: '09:00', end: '17:00', enabled: true },
        thursday: { start: '09:00', end: '17:00', enabled: true },
        friday: { start: '09:00', end: '17:00', enabled: true },
        saturday: { start: '10:00', end: '14:00', enabled: false },
        sunday: { start: '10:00', end: '14:00', enabled: false }
      },
      afterHoursMessage: "Thank you for calling! We're currently closed, but our AI assistant is available 24/7 to help you. How can I assist you today?",
      emergencyContact: ''
    }

    const hours = business.business_hours || defaultHours

    return NextResponse.json({
      success: true,
      hours
    })

  } catch (error) {
    logger.error('Error getting business hours', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get business hours' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    const body = await request.json()
    const { hours } = body

    if (!hours) {
      return NextResponse.json({ error: 'Business hours data is required' }, { status: 400 })
    }

    // Update business hours in database
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        business_hours: hours,
        timezone: hours.timezone,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      logger.error('Error updating business hours', { 
        error: updateError.message, 
        businessId 
      })
      return NextResponse.json({ error: 'Failed to update business hours' }, { status: 500 })
    }

    logger.info('Business hours updated', { 
      businessId, 
      enabled: hours.enabled,
      timezone: hours.timezone 
    })

    return NextResponse.json({
      success: true,
      message: 'Business hours updated successfully'
    })

  } catch (error) {
    logger.error('Error updating business hours', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update business hours' 
    }, { status: 500 })
  }
}
