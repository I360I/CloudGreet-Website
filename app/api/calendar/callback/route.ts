import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if Google Calendar is configured
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/dashboard?calendar_error=not_configured`)
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      logger.error('Google Calendar OAuth error', { 
        error: error, 
        state
      })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/dashboard?calendar_error=${encodeURIComponent(error)}`)
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/dashboard?calendar_error=no_code`)
    }

    logger.info('Google Calendar OAuth callback received', {
      code: code.substring(0, 10) + '...',
      state
    })

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'google_client_id',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || 'google_client_secret',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/api/calendar/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      logger.error('Failed to exchange Google OAuth code', {
        error: errorData,
        status: tokenResponse.status
      })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/dashboard?calendar_error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()
    
    // Store calendar credentials in database
    // Note: In production, you'd want to encrypt these tokens
    // State parameter contains business_id (not business_name)
    const businessId = state
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for calendar integration', {
        error: businessError?.message,
        businessId: state
      })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/dashboard?calendar_error=business_not_found`)
    }

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        google_access_token: tokenData.access_token,
        google_refresh_token: tokenData.refresh_token,
        google_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        calendar_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', business.id)

    if (updateError) {
      logger.error('Failed to store Google Calendar credentials', {
        error: updateError.message,
        businessId: business.id
      })
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/dashboard?calendar_error=storage_failed`)
    }

    logger.info('Google Calendar integration completed successfully', {
      businessId: business.id
    })

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/dashboard?calendar_success=true`)

  } catch (error) {
    logger.error('Calendar callback error', { 
      error: error instanceof Error ? error.message.replace(/[<>]/g, '') : 'Unknown error', 
      endpoint: 'calendar/callback'
    })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}/dashboard?calendar_error=internal_error`)
  }
}
