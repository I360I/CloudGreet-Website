import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { findLeadEmail } from '@/lib/lead-enrichment/multi-source-email-finder'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_LEADS = 100

// POST /api/sales/leads/find-emails
// Body: { leadIds: string[] }
// Searches business website + directories (DuckDuckGo, Manta, YellowPages, Superpages) for each lead.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const leadIds: string[] = (body?.leadIds || []).slice(0, MAX_LEADS)
  if (leadIds.length === 0) {
    return NextResponse.json({ success: true, results: [] })
  }

  // Fetch leads -- include business_name + city for directory search
  // No website filter: we can find emails via directories even without a website
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, city, website')
    .in('id', leadIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, results: [] })
  }

  // Run 10 at a time
  const CONCURRENCY = 10
  const results: { leadId: string; email: string | null }[] = []

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const chunk = leads.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      chunk.map(async (lead) => {
        const email = await findLeadEmail(lead).catch(() => null)
        await supabaseAdmin
          .from('leads')
          .update({ email: email ?? '' })
          .eq('id', lead.id)
        return { leadId: lead.id, email }
      }),
    )
    for (const s of settled) {
      results.push(s.status === 'fulfilled' ? s.value : { leadId: '', email: null })
    }
  }

  const found = results.filter((r) => r.email).length
  logger.info('find-emails: done', { found, total: leads.length, repId: auth.userId })
  return NextResponse.json({ success: true, results })
}
