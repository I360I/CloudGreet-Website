import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { moderateRateLimit } from '@/lib/rate-limiting-redis'
import { getBusinessTheme } from '@/lib/business-theme'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get Business Configuration with Theme
 * Returns complete business configuration and personalized theme
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

    // Fetch business data
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        business_name,
        business_type,
        services,
        job_types,
        business_hours,
        timezone,
        average_appointment_duration,
        greeting_message,
        tone,
        ai_tone,
        address,
        city,
        state,
        zip_code,
        phone_number,
        phone,
        email,
        website,
        calendar_connected,
        stripe_customer_id
      `)
      .eq('id', businessId)
      .eq('owner_id', authResult.userId)
      .single()

    if (businessError || !business) {
      logger.error('Failed to fetch business config', {
        error: businessError instanceof Error ? businessError.message : String(businessError),
        userId: authResult.userId,
        businessId
      })
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    // Generate theme from business data
    const theme = getBusinessTheme(
      business.business_type || 'General',
      business.services || []
    )

    // Format response
    const response = {
      success: true,
      business: {
        id: business.id,
        name: business.business_name,
        type: business.business_type || 'General',
        services: business.services || [],
        jobTypes: business.job_types || business.services || [],
        hours: business.business_hours || {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '14:00', enabled: false },
          sunday: { start: '10:00', end: '14:00', enabled: false }
        },
        timezone: business.timezone || 'America/New_York',
        averageAppointmentDuration: business.average_appointment_duration || 60,
        greetingMessage: business.greeting_message || `Hello, thank you for calling ${business.business_name}. How can I help you today?`,
        tone: business.tone || business.ai_tone || 'professional',
        address: business.address || '',
        city: business.city || '',
        state: business.state || '',
        zipCode: business.zip_code || '',
        phoneNumber: business.phone_number || business.phone || '',
        email: business.email || '',
        website: business.website || null,
        calendarConnected: business.calendar_connected || false,
        stripeCustomerId: business.stripe_customer_id || null
      },
      theme: {
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        serviceColors: theme.serviceColors,
        labelMap: theme.labelMap,
        iconMap: theme.iconMap
      }
    }

    // Set cache headers (300s = 5 minutes)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        ...rateLimitResult.headers
      }
    })
  } catch (error) {
    logger.error('Error fetching business config', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch business config' },
      { status: 500 }
    )
  }
}

