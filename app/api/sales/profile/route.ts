import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET / PATCH /api/sales/profile
 *
 * Rep-editable subset of their sales_reps row. Right now just the
 * booking_url field — extend here as we add more rep-controlled
 * settings (notification prefs, email signature, etc).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const [{ data: user }, { data: rep }] = await Promise.all([
    supabaseAdmin
      .from('custom_users')
      .select('email, name, first_name, last_name')
      .eq('id', auth.userId)
      .maybeSingle(),
    supabaseAdmin
      .from('sales_reps')
      .select('booking_url')
      .eq('id', auth.userId)
      .maybeSingle(),
  ])

  return NextResponse.json({
    success: true,
    profile: {
      email: user?.email || '',
      name: user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || '',
      booking_url: rep?.booking_url || '',
    },
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body?.booking_url !== undefined) {
    if (body.booking_url === null || body.booking_url === '') {
      update.booking_url = null
    } else {
      const raw = String(body.booking_url).trim()
      if (raw.length > 500) {
        return NextResponse.json({ error: 'URL too long' }, { status: 400 })
      }
      // Lightweight URL validation — must be http(s) and parse cleanly.
      let normalized = raw
      if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`
      try {
        const u = new URL(normalized)
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error('non-http')
        update.booking_url = u.toString()
      } catch {
        return NextResponse.json({ error: 'Booking URL must be a valid http(s) link' }, { status: 400 })
      }
    }
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('sales_reps')
    .update(update)
    .eq('id', auth.userId)
  if (error) {
    logger.error('Sales profile patch failed', {
      userId: auth.userId, error: error.message,
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
