import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { generateGoogleAuthUrl, clearGoogleTokens } from '@/lib/calendar'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function resolveBusinessId(userId: string, businessId?: string | null) {
  if (businessId) return businessId
  const { data } = await supabaseAdmin
    .from('custom_users')
    .select('business_id')
    .eq('id', userId)
    .single()
  return data?.business_id ?? null
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  const businessId = await resolveBusinessId(auth.userId, auth.businessId)
  if (!businessId) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Google Calendar credentials not configured' },
      { status: 500 }
    )
  }

  const url = generateGoogleAuthUrl(businessId)
  return NextResponse.json({ success: true, url })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const businessId = await resolveBusinessId(auth.userId, auth.businessId)
    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    await clearGoogleTokens(businessId)

    await supabaseAdmin
      .from('businesses')
      .update({
        onboarding_step: 2,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to disconnect Google Calendar', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to disconnect calendar' }, { status: 500 })
  }
}


