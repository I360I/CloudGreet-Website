import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import {
  DEFAULT_BOOKING_SMS_TEMPLATE,
  TEMPLATE_MAX_LENGTH,
} from '@/lib/booking-notifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET    /api/dashboard/notifications  → current settings + defaults
 * PATCH  /api/dashboard/notifications  → update phone and/or template
 */

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('notifications_phone, booking_sms_template, business_name')
    .eq('id', auth.businessId)
    .maybeSingle()
  if (error || !data) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }
  return NextResponse.json({
    success: true,
    notifications_phone: (data as any).notifications_phone || '',
    booking_sms_template: (data as any).booking_sms_template || DEFAULT_BOOKING_SMS_TEMPLATE,
    business_name: (data as any).business_name || '',
    default_template: DEFAULT_BOOKING_SMS_TEMPLATE,
    template_max_length: TEMPLATE_MAX_LENGTH,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({})) as {
    notifications_phone?: string | null
    booking_sms_template?: string | null
  }
  const update: Record<string, any> = { updated_at: new Date().toISOString() }

  if (body.notifications_phone !== undefined) {
    const raw = (body.notifications_phone || '').toString().trim()
    if (raw === '') {
      update.notifications_phone = null
    } else {
      const norm = normalizeUsPhone(raw)
      if (!norm) {
        return NextResponse.json({ error: 'Phone must be a US number with 10 digits.' }, { status: 400 })
      }
      update.notifications_phone = norm
    }
  }

  if (body.booking_sms_template !== undefined) {
    const tpl = (body.booking_sms_template || '').toString()
    if (tpl.length > TEMPLATE_MAX_LENGTH) {
      return NextResponse.json({
        error: `Template must be ${TEMPLATE_MAX_LENGTH} chars or fewer (yours is ${tpl.length}).`,
      }, { status: 400 })
    }
    // Empty string -> null so we fall back to the default at send time.
    update.booking_sms_template = tpl.trim() ? tpl : null
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('businesses')
    .update(update)
    .eq('id', auth.businessId)
  if (error) {
    logger.warn('booking-notifications PATCH failed', { error: error.message })
    return NextResponse.json({
      error: error.message.includes('notifications_phone') || error.message.includes('booking_sms_template')
        ? 'Run sql/booking-notifications.sql first - the notifications columns are missing.'
        : error.message,
    }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

/**
 * Normalize a user-typed phone to E.164. Returns null if unparseable.
 */
function normalizeUsPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (raw.startsWith('+') && digits.length >= 10) return `+${digits}`
  return null
}
