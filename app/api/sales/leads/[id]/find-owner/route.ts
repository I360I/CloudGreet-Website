import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { findOwner } from '@/lib/cold-outreach/find-owner'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/find-owner
 *
 * On-demand owner-name lookup for the "Find owner" button on the leads
 * workspace (setter + rep). Returns the owner's name + a confidence/source
 * tag so the rep can ask for them by name and beat the gatekeeper.
 *
 * Cached: once a lead has been looked up (owner_verified_at set), a repeat
 * click returns the stored result for free. Pass { force: true } to re-run
 * (e.g. a previous "not found"). The lead must belong to the caller.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { force?: boolean }
  const force = body?.force === true

  // Only leads assigned to the caller.
  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id')
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
    .maybeSingle()
  if (!assignment) {
    return NextResponse.json({ error: 'Not your lead' }, { status: 404 })
  }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, city, state, website, contact_name, owner_confidence, owner_source, owner_verified_at')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Cached hit: already looked up and not forcing a refresh.
  if (lead.owner_verified_at && !force) {
    const name = (lead.contact_name || '').trim()
    return NextResponse.json({
      cached: true,
      name: name || null,
      confidence: lead.owner_confidence || (name ? 'medium' : 'low'),
      source: lead.owner_source || (name ? 'web search' : 'not_found'),
    })
  }

  const result = await findOwner({
    businessName: lead.business_name,
    city: lead.city,
    state: lead.state,
    website: lead.website,
  })

  // Cache the outcome (name, or '' as the attempted-but-empty marker).
  const { error: upErr } = await supabaseAdmin
    .from('leads')
    .update({
      contact_name: result.name ?? '',
      owner_confidence: result.confidence,
      owner_source: result.source,
      owner_verified_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (upErr) {
    logger.warn('find-owner: cache write failed', { leadId: params.id, error: upErr.message })
  }

  return NextResponse.json({
    cached: false,
    name: result.name,
    title: result.title,
    confidence: result.confidence,
    source: result.source,
  })
}
