import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { getStripeMrrSummary } from '@/lib/billing/stripe-mrr'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/billing/reconciliation/export
 *
 * Dumps the live Stripe subscription roster as CSV - one row per
 * subscription with the columns Anthony actually needs to forecast,
 * import into a spreadsheet, or share with an accountant. Replaces
 * the old per-tenant ledger export which was empty for admin
 * contexts (admins have no businessId) and only contained four
 * zero-value summary rows.
 */
export async function GET(request: NextRequest) {
 const auth = await requireAdmin(request)
 if (!auth.success) {
  return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
 }

 try {
  const summary = await getStripeMrrSummary()

  // Resolve business names for each sub. We try the metadata first
  // (admin-generated checkouts set cloudgreet_business_id); for older
  // subs we fall back to a stripe_customer_id match.
  const businessIds = summary.subscriptions
   .map((s) => s.cloudgreetBusinessId)
   .filter((x): x is string => !!x)
  const customerIds = summary.subscriptions
   .map((s) => s.customerId)
   .filter(Boolean)

  const [byId, byCustomer] = await Promise.all([
   businessIds.length
    ? supabaseAdmin.from('businesses').select('id, business_name').in('id', businessIds)
    : Promise.resolve({ data: [] as Array<{ id: string; business_name: string | null }> }),
   customerIds.length
    ? supabaseAdmin
       .from('businesses')
       .select('id, business_name, stripe_customer_id')
       .in('stripe_customer_id', customerIds)
    : Promise.resolve({ data: [] as Array<{ id: string; business_name: string | null; stripe_customer_id: string | null }> }),
  ])

  const nameById = new Map<string, string>()
  for (const row of (byId.data || [])) {
   if (row.business_name) nameById.set(row.id, row.business_name)
  }
  const nameByCustomer = new Map<string, string>()
  for (const row of ((byCustomer as any).data || [])) {
   if (row.business_name && row.stripe_customer_id) {
    nameByCustomer.set(row.stripe_customer_id, row.business_name)
   }
  }

  const headers = [
   'Business name',
   'Status',
   'Plan',
   'Monthly $',
   'Annualized $',
   'Trial ends',
   'Current period ends',
   'Cancels at period end',
   'Stripe subscription',
   'Stripe customer',
  ]
  const rows: string[][] = [headers]

  for (const sub of summary.subscriptions) {
   const name =
    (sub.cloudgreetBusinessId && nameById.get(sub.cloudgreetBusinessId)) ||
    nameByCustomer.get(sub.customerId) ||
    '(unmapped)'
   const monthly = (sub.monthlyCents / 100).toFixed(2)
   const annualized = ((sub.monthlyCents * 12) / 100).toFixed(2)
   const trial = sub.trialEnd ? new Date(sub.trialEnd * 1000).toISOString().slice(0, 10) : ''
   const periodEnd = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd * 1000).toISOString().slice(0, 10)
    : ''
   rows.push([
    name,
    sub.status,
    sub.metadataPlan || '',
    monthly,
    annualized,
    trial,
    periodEnd,
    sub.cancelAtPeriodEnd ? 'yes' : '',
    sub.id,
    sub.customerId,
   ])
  }

  // Totals row at the bottom for quick eyeballing
  rows.push([])
  rows.push([
   'TOTAL',
   `${summary.paidCount} paid · ${summary.trialingCount} trialing · ${summary.pastDueCount} past due`,
   '',
   (summary.totalMrrCents / 100).toFixed(2),
   ((summary.totalMrrCents * 12) / 100).toFixed(2),
   '', '', '', '', '',
  ])

  const csv = rows.map(toCsvLine).join('\n')
  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
   status: 200,
   headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="cloudgreet-subscriptions-${today}.csv"`,
   },
  })
 } catch (e) {
  return NextResponse.json(
   { error: e instanceof Error ? e.message : 'Failed to export' },
   { status: 500 },
  )
 }
}

function toCsvLine(cells: string[]): string {
 return cells.map(escapeCsv).join(',')
}

function escapeCsv(s: string): string {
 if (s == null) return ''
 const str = String(s)
 if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
 return str
}
