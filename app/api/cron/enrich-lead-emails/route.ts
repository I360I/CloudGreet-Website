import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { findLeadEmail } from '@/lib/lead-enrichment/multi-source-email-finder'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const BATCH = 15

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pick leads with email not yet attempted (null), regardless of whether they have a website
  // Requires business_name + city OR website to be useful
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, city, website')
    .is('email', null)
    .not('status', 'eq', 'disqualified')
    .not('business_name', 'is', null)
    .order('created_at', { ascending: true })
    .limit(BATCH)

  if (error) {
    logger.error('enrich-lead-emails: query failed', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, enriched: 0, message: 'No leads to enrich' })
  }

  let enriched = 0
  let failed = 0

  for (const lead of leads) {
    try {
      const email = await findLeadEmail(lead)

      await supabaseAdmin
        .from('leads')
        .update({ email: email ?? '' })
        .eq('id', lead.id)

      if (email) {
        enriched++
        logger.info('enrich-lead-emails: found email', { leadId: lead.id, domain: email.split('@')[1] })
      }
    } catch (err) {
      failed++
      logger.warn('enrich-lead-emails: failed', {
        leadId: lead.id,
        error: err instanceof Error ? err.message : String(err),
      })
      // Mark as attempted so we don't retry forever
      await supabaseAdmin.from('leads').update({ email: '' }).eq('id', lead.id)
    }
  }

  logger.info('enrich-lead-emails: done', { enriched, failed, total: leads.length })
  return NextResponse.json({ success: true, enriched, failed, total: leads.length })
}
