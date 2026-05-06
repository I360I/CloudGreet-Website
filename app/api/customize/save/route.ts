import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/customize/save
 *   body: { answers: Record<fieldId, any> }
 *
 * Replaces businesses.customization wholesale with the posted blob.
 * Used for autosave on the client form. Bumps customization_status
 * from 'not_sent' to 'sent' on first save so the rep / admin views
 * reflect that the client has at least opened the form.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { answers?: Record<string, any> }
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : null
  if (!answers) return NextResponse.json({ error: 'answers required' }, { status: 400 })

  try {
    const { data: cur } = await supabaseAdmin
      .from('businesses')
      .select('customization_status')
      .eq('id', auth.businessId)
      .single()

    const update: Record<string, any> = {
      customization: answers,
      updated_at: new Date().toISOString(),
    }
    // Move the pipeline forward: not_sent -> sent on first interaction.
    // Don't downgrade later states (submitted/building/ready/live).
    if ((cur as any)?.customization_status === 'not_sent' || !(cur as any)?.customization_status) {
      update.customization_status = 'sent'
      update.customization_sent_at = new Date().toISOString()
    }

    const { error } = await supabaseAdmin
      .from('businesses')
      .update(update)
      .eq('id', auth.businessId)
    if (error) {
      return NextResponse.json({
        error: 'Could not save - run sql/customization-and-demo-agents.sql',
      }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error('customize save failed', {
      businessId: auth.businessId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
