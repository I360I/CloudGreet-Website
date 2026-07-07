import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { TOP_US_CITIES } from '@/lib/scrapers/us-cities'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET  /api/admin/harvest - pipeline status: target queue counts, leads
 *      harvested/enriched by category, auto-feed campaign mapping.
 * POST /api/admin/harvest { categories: string[], city_count?: number }
 *      Seed harvest targets: each category x top-N US cities. Existing
 *      combos are skipped (unique constraint), so re-seeding with a
 *      bigger city_count only adds the new tail.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: targets }, { data: harvested }, { data: campaigns }] = await Promise.all([
    supabaseAdmin.from('harvest_targets').select('status'),
    supabaseAdmin.from('leads').select('business_type, email').eq('source', 'harvest'),
    supabaseAdmin.from('email_campaigns')
      .select('id, name, status, auto_feed_category, sent_count, reply_count')
      .not('auto_feed_category', 'is', null),
  ])

  const t = (targets || []) as any[]
  const byCat = new Map<string, { harvested: number; with_email: number }>()
  for (const l of (harvested || []) as any[]) {
    const e = byCat.get(l.business_type) || { harvested: 0, with_email: 0 }
    e.harvested += 1
    if (l.email) e.with_email += 1
    byCat.set(l.business_type, e)
  }

  return NextResponse.json({
    success: true,
    targets: {
      pending: t.filter((x) => x.status === 'pending').length,
      done: t.filter((x) => x.status === 'done').length,
      error: t.filter((x) => x.status === 'error').length,
    },
    leads_by_category: Object.fromEntries(byCat),
    auto_feed_campaigns: campaigns || [],
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { categories?: string[]; city_count?: number }
  const categories = (body.categories || [])
    .map((c) => String(c).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10)
  const cityCount = Math.min(Math.max(Number(body.city_count) || 50, 1), TOP_US_CITIES.length)
  if (categories.length === 0) {
    return NextResponse.json({ error: 'categories required' }, { status: 400 })
  }

  const rows = categories.flatMap((category) =>
    TOP_US_CITIES.slice(0, cityCount).map((c) => ({
      category, city: c.city, state: c.state, lat: c.lat, lng: c.lng,
    })),
  )

  const { error, count } = await supabaseAdmin
    .from('harvest_targets')
    .upsert(rows, { onConflict: 'category,city,state', ignoreDuplicates: true, count: 'exact' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, seeded: count ?? rows.length, total_combos: rows.length })
}
