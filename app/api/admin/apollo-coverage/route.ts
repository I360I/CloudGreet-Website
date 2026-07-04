import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { apolloEnabled, orgEnrich, findOwner, domainFromWebsite } from '@/lib/apollo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/admin/apollo-coverage?limit=25
 *
 * One-off coverage probe to decide whether Apollo is worth paying for:
 * samples recent leads that are missing contact info, asks Apollo (via
 * search-level calls only - burns no export credits) whether it knows
 * the company / an owner name / that an email or phone exists, and
 * returns the tally with a verdict. Open it in the browser while logged
 * in as admin. Runs on Vercel because the Apollo API needs prod egress.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!apolloEnabled()) {
    return NextResponse.json({ error: 'APOLLO_API_KEY is not set in this environment' }, { status: 503 })
  }

  const limit = Math.min(50, Math.max(5, Number(request.nextUrl.searchParams.get('limit')) || 25))

  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, website, city, state, contact_name, email')
    .not('website', 'is', null)
    .or('contact_name.is.null,email.is.null')
    .order('created_at', { ascending: false })
    .limit(limit * 2) // headroom for unparseable websites
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sample: { business: string; domain: string; city: string | null }[] = []
  const seen = new Set<string>()
  for (const l of leads || []) {
    const domain = domainFromWebsite(l.website)
    if (!domain || seen.has(domain)) continue
    seen.add(domain)
    sample.push({ business: l.business_name, domain, city: l.city })
    if (sample.length >= limit) break
  }

  const rows: {
    business: string; domain: string
    company_found: boolean; owner_name: string | null; owner_title: string | null
    email_available: boolean; phone_available: boolean
  }[] = []

  // Small concurrency so we fit the function window without tripping
  // Apollo's per-minute rate limits.
  const CONCURRENCY = 4
  for (let i = 0; i < sample.length; i += CONCURRENCY) {
    const chunk = sample.slice(i, i + CONCURRENCY)
    const results = await Promise.all(chunk.map(async (s) => {
      try {
        const [org, owner] = await Promise.all([orgEnrich(s.domain), findOwner(s.domain)])
        return {
          business: s.business,
          domain: s.domain,
          company_found: !!org,
          owner_name: owner?.name || null,
          owner_title: owner?.title || null,
          email_available: !!owner?.has_email,
          phone_available: !!owner?.has_phone,
        }
      } catch {
        return {
          business: s.business, domain: s.domain,
          company_found: false, owner_name: null, owner_title: null,
          email_available: false, phone_available: false,
        }
      }
    }))
    rows.push(...results)
  }

  const n = rows.length || 1
  const tally = {
    sampled: rows.length,
    company_found: rows.filter((r) => r.company_found).length,
    owner_name: rows.filter((r) => r.owner_name).length,
    owner_name_and_email: rows.filter((r) => r.owner_name && r.email_available).length,
    email_available: rows.filter((r) => r.email_available).length,
    phone_available: rows.filter((r) => r.phone_available).length,
  }
  const matchPct = Math.round((tally.owner_name_and_email / n) * 100)
  const verdict =
    matchPct >= 40 ? `WORTH IT (${matchPct}% owner+email) - build the enrichment pipeline.`
    : matchPct <= 15 ? `SKIP (${matchPct}% owner+email) - Apollo barely knows this ICP.`
    : `BORDERLINE (${matchPct}% owner+email) - worth it mainly if the email channel matters to you.`

  return NextResponse.json({ success: true, verdict, tally, rows })
}
