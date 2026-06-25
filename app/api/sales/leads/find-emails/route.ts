import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { scrapeWebsite } from '@/lib/lead-enrichment/website-scraper'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_LEADS = 20

const JUNK_EMAIL_PATTERNS = [
  /noreply/i, /no-reply/i, /donotreply/i,
  /@wordpress\./i, /@wix\./i, /@squarespace\./i,
  /@example\./i, /@sentry\./i, /@gravatar\./i,
]
function isUsableEmail(e: string) {
  return !JUNK_EMAIL_PATTERNS.some((p) => p.test(e))
}

// POST /api/sales/leads/find-emails
// Body: { leadIds: string[] }
// Scrapes each lead's website and returns found emails. Updates leads table.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const leadIds: string[] = (body?.leadIds || []).slice(0, MAX_LEADS)
  if (leadIds.length === 0) {
    return NextResponse.json({ success: true, results: [] })
  }

  // Verify these leads belong to this rep and fetch website
  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, website')
    .in('id', leadIds)
    .not('website', 'is', null)
    .neq('website', '')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, results: [] })
  }

  // Scrape concurrently (5 at a time)
  const CONCURRENCY = 5
  const results: { leadId: string; email: string | null }[] = []

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const chunk = leads.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      chunk.map(async (lead) => {
        try {
          const scraped = await scrapeWebsite(lead.website!)
          const email = scraped.emails.find(isUsableEmail) || null
          await supabaseAdmin
            .from('leads')
            .update({ email: email ?? '' })
            .eq('id', lead.id)
          return { leadId: lead.id, email }
        } catch (err) {
          logger.warn('find-emails: scrape failed', {
            leadId: lead.id,
            error: err instanceof Error ? err.message : String(err),
          })
          await supabaseAdmin
            .from('leads')
            .update({ email: '' })
            .eq('id', lead.id)
          return { leadId: lead.id, email: null }
        }
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
