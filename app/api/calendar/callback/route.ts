import { NextRequest, NextResponse } from 'next/server'
import { saveGoogleTokens } from '@/lib/calendar'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

function getRedirectUri() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://cloudgreet.com'
  return `${baseUrl.replace(/\/$/, '')}/api/calendar/callback`
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const businessId = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')

  const redirectBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://cloudgreet.com'

  const successRedirect = `${redirectBase.replace(/\/$/, '')}/onboarding?calendar=success`
  const errorRedirect = `${redirectBase.replace(/\/$/, '')}/onboarding?calendar=error`

  if (errorParam) {
    logger.warn('Google calendar auth error', { error: errorParam })
    return NextResponse.redirect(`${errorRedirect}&reason=${encodeURIComponent(errorParam)}`)
  }

  if (!code || !businessId) {
    logger.warn('Google calendar callback missing parameters', { code, businessId })
    return NextResponse.redirect(`${errorRedirect}&reason=missing_parameters`)
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    logger.error('Google credentials missing during calendar callback')
    return NextResponse.redirect(`${errorRedirect}&reason=missing_credentials`)
  }

  try {
    const body = new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code'
    })

    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      logger.error('Google token exchange failed', {
        status: tokenResponse.status,
        body: errorText
      })
      return NextResponse.redirect(`${errorRedirect}&reason=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()

    await saveGoogleTokens(businessId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      token_type: tokens.token_type
    })

    await supabaseAdmin
      .from('businesses')
      .update({
        onboarding_step: 3,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    return NextResponse.redirect(successRedirect)
  } catch (error) {
    logger.error('Calendar callback unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.redirect(`${errorRedirect}&reason=unexpected_error`)
  }
}


