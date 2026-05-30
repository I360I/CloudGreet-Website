import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/clients/[id]/cost-margin
 *
 * Cost-to-serve for one client: measured provider cost (Retell voice,
 * Anthropic LLM, Telnyx SMS, Stripe fees, Google routes) from usage_costs,
 * plus an allocated share of flat infra, shown against what the client
 * pays (monthly_price_cents) as a margin.
 *
 * Returns cents. Two windows: month-to-date and lifetime.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const adminAuth = await requireAdmin(request)
  if (!adminAuth.success) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
  }

  const businessId = params.id
  const now = new Date()
  const monthStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  try {
    // What the client pays (negotiated monthly price) for the margin line.
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, monthly_price_cents, subscription_status')
      .eq('id', businessId)
      .maybeSingle()

    if (!biz) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // All measured cost rows for this client. Volume is tiny per client, so
    // pull and bucket in JS rather than round-trip per window/provider.
    const { data: rows, error: costErr } = await supabaseAdmin
      .from('usage_costs')
      .select('provider, kind, amount_cents, occurred_at')
      .eq('business_id', businessId)
    if (costErr) {
      logger.error('cost-margin: usage_costs query failed', { businessId, error: costErr.message })
      return NextResponse.json({ error: 'query_failed' }, { status: 500 })
    }

    const blankProviders = () => ({ retell: 0, anthropic: 0, telnyx: 0, stripe: 0, google: 0 })
    const month = { total: 0, byProvider: blankProviders() as Record<string, number> }
    const lifetime = { total: 0, byProvider: blankProviders() as Record<string, number> }

    for (const r of rows || []) {
      const cents = (r.amount_cents as number) || 0
      const provider = (r.provider as string) || 'other'
      lifetime.total += cents
      if (provider in lifetime.byProvider) lifetime.byProvider[provider] += cents
      if ((r.occurred_at as string) >= monthStartIso) {
        month.total += cents
        if (provider in month.byProvider) month.byProvider[provider] += cents
      }
    }

    // Per-customer measured cost only - no flat-infra allocation. Infra
    // (Vercel/Supabase/Cal.com/Resend) is all on free tiers, and the policy
    // is to track only what each individual customer costs.
    const monthlyRevenueCents = (biz.monthly_price_cents as number) || 0
    const marginCents = monthlyRevenueCents - month.total
    const marginPct = monthlyRevenueCents > 0 ? Math.round((marginCents / monthlyRevenueCents) * 1000) / 10 : null

    return NextResponse.json({
      generatedAt: now.toISOString(),
      businessId,
      monthToDate: {
        measuredCostCents: month.total,
        byProvider: month.byProvider,
        totalCostCents: month.total,
        revenueCents: monthlyRevenueCents,
        marginCents,
        marginPct,
      },
      lifetime: {
        measuredCostCents: lifetime.total,
        byProvider: lifetime.byProvider,
      },
    })
  } catch (e) {
    logger.error('cost-margin failed', { businessId, error: e instanceof Error ? e.message : 'Unknown' })
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
