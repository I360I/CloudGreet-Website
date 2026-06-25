import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { scrapeWebsite } from '@/lib/lead-enrichment/website-scraper'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const BATCH = 15

// Emails that are platform noise, not real contact addresses
const JUNK_EMAIL_PATTERNS = [
  /noreply/i, /no-reply/i, /donotreply/i,
  /@wordpress\./i, /@wix\./i, /@squarespace\./i,
  /@example\./i, /@sentry\./i, /@gravatar\./i,
]

function isUsableEmail(email: string): boolean {
  return !JUNK_EMAIL_PATTERNS.some((p) => p.test(email))
}

export async function GET(request: NextRequest) {
  // Vercel cron sends an Authorization header in production
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Leads with a website but no email, not disqualified, oldest first
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, website')
    .not('website', 'is', null)
    .neq('website', '')
    .is('email', null)
    .not('status', 'eq', 'disqualified')
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
      const result = await scrapeWebsite(lead.website)
      const email = result.emails.find(isUsableEmail) || null

      await supabaseAdmin
        .from('leads')
        .update({ email })
        .eq('id', lead.id)

      if (email) enriched++
    } catch (err) {
      failed++
      logger.warn('enrich-lead-emails: scrape failed', {
        leadId: lead.id,
        website: lead.website,
        error: err instanceof Error ? err.message : String(err),
      })
      // Mark as attempted so we don't retry forever -- set email to empty string
      // so it drops out of the IS NULL filter. A null means "not tried yet".
      await supabaseAdmin
        .from('leads')
        .update({ email: '' })
        .eq('id', lead.id)
    }
  }

  logger.info('enrich-lead-emails: done', { enriched, failed, total: leads.length })
  return NextResponse.json({ success: true, enriched, failed, total: leads.length })
}
