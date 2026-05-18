import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import {
  DEFAULT_BOOKING_SMS_TEMPLATE,
  DEFAULT_EMERGENCY_SMS_TEMPLATE,
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
    .select('notifications_phone, escalation_phone, booking_sms_template, booking_sms_template_emergency, business_name')
    .eq('id', auth.businessId)
    .maybeSingle()
  if (error || !data) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }
  return NextResponse.json({
    success: true,
    notifications_phone: (data as any).notifications_phone || '',
    transfer_phone: (data as any).escalation_phone || '',
    booking_sms_template: (data as any).booking_sms_template || DEFAULT_BOOKING_SMS_TEMPLATE,
    booking_sms_template_emergency:
      (data as any).booking_sms_template_emergency || DEFAULT_EMERGENCY_SMS_TEMPLATE,
    business_name: (data as any).business_name || '',
    default_template: DEFAULT_BOOKING_SMS_TEMPLATE,
    default_emergency_template: DEFAULT_EMERGENCY_SMS_TEMPLATE,
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
    transfer_phone?: string | null
    booking_sms_template?: string | null
    booking_sms_template_emergency?: string | null
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

  if (body.transfer_phone !== undefined) {
    const raw = (body.transfer_phone || '').toString().trim()
    if (raw === '') {
      update.escalation_phone = null
    } else {
      const norm = normalizeUsPhone(raw)
      if (!norm) {
        return NextResponse.json({ error: 'Transfer phone must be a US number with 10 digits.' }, { status: 400 })
      }
      update.escalation_phone = norm
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
  if (body.booking_sms_template_emergency !== undefined) {
    const tpl = (body.booking_sms_template_emergency || '').toString()
    if (tpl.length > TEMPLATE_MAX_LENGTH) {
      return NextResponse.json({
        error: `Emergency template must be ${TEMPLATE_MAX_LENGTH} chars or fewer (yours is ${tpl.length}).`,
      }, { status: 400 })
    }
    update.booking_sms_template_emergency = tpl.trim() ? tpl : null
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

  // When the phone changes, the Retell agent's transfer_call destination
  // becomes stale - it was set the last time we wired tools. Push the
  // current tool set (which re-reads notifications_phone) so transfers
  // route to the new number. Synchronous now so failures surface as
  // toolsError in the response rather than vanishing into logs.
  let toolsError: string | null = null
  let toolsTrace: string[] = []
  if (body.notifications_phone !== undefined || body.transfer_phone !== undefined) {
    try {
      const { retellAgentManager } = await import('@/lib/retell-agent-manager')
      toolsTrace = await retellAgentManager().ensureLLMToolsForBusiness(auth.businessId!)
    } catch (e) {
      toolsError = e instanceof Error ? e.message : 'Unknown'
      logger.warn('Re-wire tools after phone change failed', {
        businessId: auth.businessId,
        error: toolsError,
      })
    }
  }

  return NextResponse.json({ success: true, toolsError, toolsTrace })
}

/**
 * Normalize a user-typed phone to E.164. Returns null if unparseable.
 */
function normalizeUsPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  // Bare 10-digit number -> assume US, prepend +1.
  if (digits.length === 10) return `+1${digits}`
  // 11 digits starting with 1 -> already has country code.
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  // The previous version also accepted any string starting with "+"
  // as long as it had 10+ digits. That let "+7372960092" through as
  // an "international" number when it's really a US number missing
  // the +1 country code - Retell then rejected it as invalid E.164
  // and the transfer_call tool was silently dropped.
  return null
}
