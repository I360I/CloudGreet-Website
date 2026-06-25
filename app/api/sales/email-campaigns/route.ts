import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/sales/email-campaigns - list the rep's campaigns
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .select('id, name, from_name, from_email, reply_to, subject, status, sent_count, bounce_count, reply_count, created_by, created_at, updated_at')
      .eq('created_by', auth.userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch rep email campaigns', { userId: auth.userId, error: error.message })
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaigns: data || [] })
  } catch (err) {
    logger.error('GET /api/sales/email-campaigns failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sales/email-campaigns - create a campaign
// Body: { name, subject, body_template, from_name?, reply_to? }
// from_email is auto-set from the rep's custom_users email
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { name, subject, body_template, from_name, reply_to } = body as Record<string, string | undefined>

    if (!name || !subject || !body_template) {
      return NextResponse.json(
        { error: 'name, subject, and body_template are required' },
        { status: 400 },
      )
    }

    // Look up the rep's email address to use as from_email
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('custom_users')
      .select('email')
      .eq('id', auth.userId)
      .maybeSingle()

    if (userErr || !userRow?.email) {
      logger.error('Failed to look up rep email for campaign', { userId: auth.userId, error: userErr?.message })
      return NextResponse.json({ error: 'Could not determine your email address' }, { status: 500 })
    }

    const from_email = userRow.email

    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .insert({
        name,
        from_name: from_name || 'CloudGreet',
        from_email,
        reply_to: reply_to || from_email,
        subject,
        body_template,
        created_by: auth.userId,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create email campaign', { userId: auth.userId, error: error.message })
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaign: data }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/sales/email-campaigns failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
