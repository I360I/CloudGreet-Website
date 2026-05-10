import { supabaseAdmin } from '../supabase'

/**
 * Dry-run version of the weekly payout sweep. Returns exactly what
 * `runWeeklyPayouts` WOULD do — per-rep amount, ledger row count,
 * skip reason, terminal vs transient — without firing any Stripe
 * transfers or writing rows. Lets admins eyeball Friday's payout
 * before pressing the real button.
 *
 * Mirrors the skip logic in run-weekly-payouts.ts. Keep both in sync
 * if conditions change there.
 */

const MIN_PAYOUT_CENTS = 100 // matches run-weekly-payouts.ts

export type PreviewStatus =
  | 'would_transfer'
  | 'skipped_too_small'
  | 'skipped_no_connect'
  | 'skipped_terminated'
  | 'skipped_no_owed'

export type PreviewRow = {
  rep_id: string
  rep_email: string | null
  rep_name: string | null
  status: PreviewStatus
  amount_cents: number
  ledger_count: number
  rep_status: 'active' | 'paused' | 'terminated' | null
  stripe_connect_account_id: string | null
  stripe_payouts_enabled: boolean
}

export async function previewWeeklyPayouts(): Promise<{
  rep_count: number
  total_would_pay_cents: number
  results: PreviewRow[]
}> {
  // Pull every rep with at least one unpaid commission_ledger row.
  // Same scope as run-weekly-payouts.ts.
  const { data: ledgerRows } = await supabaseAdmin
    .from('commission_ledger')
    .select('rep_id, commission_cents')
    .is('payout_id', null)

  const owedByRep = new Map<string, { total: number; count: number }>()
  for (const row of ledgerRows || []) {
    const cur = owedByRep.get(row.rep_id) || { total: 0, count: 0 }
    cur.total += row.commission_cents || 0
    cur.count += 1
    owedByRep.set(row.rep_id, cur)
  }

  const repIds = Array.from(owedByRep.keys())
  if (repIds.length === 0) {
    return { rep_count: 0, total_would_pay_cents: 0, results: [] }
  }

  const [{ data: reps }, { data: users }] = await Promise.all([
    supabaseAdmin
      .from('sales_reps')
      .select('id, status, stripe_connect_account_id, stripe_connect_payouts_enabled')
      .in('id', repIds),
    supabaseAdmin
      .from('custom_users')
      .select('id, email, name, first_name')
      .in('id', repIds),
  ])

  const repById = new Map<string, any>()
  for (const r of reps || []) repById.set(r.id, r)
  const userById = new Map<string, any>()
  for (const u of users || []) userById.set(u.id, u)

  const results: PreviewRow[] = repIds.map((repId) => {
    const owed = owedByRep.get(repId)!
    const rep = repById.get(repId)
    const user = userById.get(repId)
    const base: Omit<PreviewRow, 'status' | 'amount_cents'> = {
      rep_id: repId,
      rep_email: user?.email || null,
      rep_name: user?.first_name || user?.name || null,
      ledger_count: owed.count,
      rep_status: rep?.status || null,
      stripe_connect_account_id: rep?.stripe_connect_account_id || null,
      stripe_payouts_enabled: !!rep?.stripe_connect_payouts_enabled,
    }

    if (!rep) {
      return { ...base, status: 'skipped_no_connect', amount_cents: 0 }
    }
    if (rep.status === 'terminated') {
      return { ...base, status: 'skipped_terminated', amount_cents: 0 }
    }
    if (!rep.stripe_connect_account_id || !rep.stripe_connect_payouts_enabled) {
      return { ...base, status: 'skipped_no_connect', amount_cents: 0 }
    }
    if (owed.total <= 0) {
      return { ...base, status: 'skipped_no_owed', amount_cents: 0 }
    }
    if (owed.total < MIN_PAYOUT_CENTS) {
      return { ...base, status: 'skipped_too_small', amount_cents: owed.total }
    }
    return { ...base, status: 'would_transfer', amount_cents: owed.total }
  })

  results.sort((a, b) => b.amount_cents - a.amount_cents)

  const totalWouldPay = results
    .filter((r) => r.status === 'would_transfer')
    .reduce((s, r) => s + r.amount_cents, 0)

  return {
    rep_count: repIds.length,
    total_would_pay_cents: totalWouldPay,
    results,
  }
}
