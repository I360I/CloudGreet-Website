import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = params

    const [campaignRes, leadsRes] = await Promise.all([
      supabaseAdmin
        .from('email_campaigns')
        .select('*')
        .eq('id', id)
        .single(),
      supabaseAdmin
        .from('email_leads')
        .select('id, email, owner_name, business_name, city, phone, source, status, sent_at, resend_message_id, error, created_at')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    if (campaignRes.error || !campaignRes.data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      campaign: campaignRes.data,
      leads: leadsRes.data || [],
    })
  } catch (err) {
    logger.error('GET /api/admin/email-campaigns/[id] failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const allowedFields = ['name', 'from_name', 'from_email', 'reply_to', 'subject', 'body_template', 'status']
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update campaign', { error: error.message })
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaign: data })
  } catch (err) {
    logger.error('PATCH /api/admin/email-campaigns/[id] failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = params

    const { error } = await supabaseAdmin
      .from('email_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Failed to delete campaign', { error: error.message })
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('DELETE /api/admin/email-campaigns/[id] failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
