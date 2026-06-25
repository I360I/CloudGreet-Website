import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .select('id, name, from_name, from_email, reply_to, subject, status, sent_count, bounce_count, reply_count, created_by, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch email campaigns', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaigns: data || [] })
  } catch (err) {
    logger.error('GET /api/admin/email-campaigns failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdmin(request)
    if (!adminAuth.success) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

    const { name, from_name, from_email, reply_to, subject, body_template, created_by } = body as Record<string, string | undefined>

    if (!name || !from_email || !subject || !body_template) {
      return NextResponse.json(
        { error: 'name, from_email, subject, and body_template are required' },
        { status: 400 },
      )
    }

    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .insert({
        name,
        from_name: from_name || 'CloudGreet',
        from_email,
        reply_to: reply_to || null,
        subject,
        body_template,
        created_by: created_by || adminAuth.userId || null,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create email campaign', { error: error.message })
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaign: data }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/admin/email-campaigns failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
