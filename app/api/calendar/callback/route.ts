import { NextRequest, NextResponse } from 'next/server'
import { getTokenAndSaveCredentials } from '@/lib/calendar'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // Should contain businessId
    
    if (!code || !state) {
      return NextResponse.json({ 
        error: 'Missing authorization code or state' 
      }, { status: 400 })
    }

    // Exchange code for tokens
    const tokenResult = await getTokenAndSaveCredentials(code, state)
    
    if (!tokenResult.success) {
      return NextResponse.json({ 
        error: 'Failed to exchange authorization code' 
      }, { status: 400 })
    }

    // Store tokens in database
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .update({
        google_calendar_tokens: tokenResult.tokens,
        calendar_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', state)
      .select()
      .single()

    if (businessError) {
      logger.error('Failed to store calendar tokens', businessError, { businessId: state })
      return NextResponse.json({ 
        error: 'Failed to store calendar connection' 
      }, { status: 500 })
    }

    logger.info('Google Calendar connected successfully', { 
      businessId: state,
      businessName: business.business_name 
    })

    // Redirect to settings page with success message
    return NextResponse.redirect(
      new URL(`/settings?tab=calendar&connected=true`, request.url)
    )

  } catch (error) {
    logger.error('Calendar callback API error', error as Error)
    return NextResponse.redirect(
      new URL(`/settings?tab=calendar&error=true`, request.url)
    )
  }
}
