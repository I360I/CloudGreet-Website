import { Resend } from 'resend'
import { supabaseAdmin } from '../supabase'
import { logger } from '../monitoring'
import { getStripeClient } from '../billing/stripe-client'

/**
 * Weekly sales-rep payout job. Sweeps every commission_ledger row
 * with payout_id IS NULL into a single Stripe Connect transfer per
 * rep, marks them paid, and emails the rep with the breakdown.
 *
 * Designed to run from a Friday cron, but also callable on-demand
 * via the admin endpoint for testing or backfills.
 *
 * Idempotency:
 *   - We create the `payouts` row first (status='pending'), then
 *     the Stripe transfer with idempotency_key=payouts.id, then
 *     stamp transferred. If the transfer call retries we don't
 *     double-pay.
 *   - If a transfer succeeds but we crash before backfilling
 *     payout_id, the next run will re-create another payout for
 *     the same ledger rows. To prevent that, we backfill payout_id
 *     IMMEDIATELY after the transfer succeeds and only mark the
 *     `payouts` row 'transferred' last.
 *
 * Skip conditions:
 *   - Rep has no Stripe Connect account, or payouts not enabled.
 *   - Rep has $0 owed.
 *   - Rep is terminated.
 *   - Owed total below MIN_PAYOUT_CENTS - rolls over to next week.
 */

const MIN_PAYOUT_CENTS = 100 // $1.00 - Stripe's hard minimum

export type PayoutSummary = {
  rep_id: string
  rep_email: string | null
  status: 'transferred' | 'failed' | 'skipped_too_small' | 'skipped_no_connect' | 'skipped_terminated' | 'skipped_no_owed'
  amount_cents: number
  ledger_count: number
  payout_id?: string
  stripe_transfer_id?: string
  failure_reason?: string
}

export async function runWeeklyPayouts(): Promise<{
  ran_at: string
  rep_count: number
  total_paid_cents: number
  results: PayoutSummary[]
}> {
  const ranAt = new Date().toISOString()
  const stripe = getStripeClient()

  // Pull every rep with at least one unpaid commission_ledger row.
  const { data: repsWithOwed } = await supabaseAdmin
    .from('commission_ledger')
    .select('rep_id')
    .is('payout_id', null)

  const uniqueRepIds = Array.from(new Set((repsWithOwed || []).map((r) => r.rep_id)))
  const results: PayoutSummary[] = []

  // Pick a Friday→Friday window for the payout record's reporting
  // dates. Rolls over correctly even when the cron fires on a
  // different day (manual run).
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 7 * 86_400_000)

  for (const repId of uniqueRepIds) {
    const result = await payoutOneRep({
      repId,
      stripe,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
    })
    results.push(result)
  }

  const totalPaid = results.reduce(
    (s, r) => s + (r.status === 'transferred' ? r.amount_cents : 0), 0,
  )

  logger.info('Weekly sales payouts run', {
    ranAt, repCount: uniqueRepIds.length, totalPaidCents: totalPaid,
  })

  return {
    ran_at: ranAt,
    rep_count: uniqueRepIds.length,
    total_paid_cents: totalPaid,
    results,
  }
}

async function payoutOneRep({
  repId, stripe, periodStart, periodEnd,
}: {
  repId: string
  stripe: ReturnType<typeof getStripeClient>
  periodStart: string
  periodEnd: string
}): Promise<PayoutSummary> {
  const [{ data: rep }, { data: user }, { data: owed }] = await Promise.all([
    supabaseAdmin
      .from('sales_reps')
      .select('id, status, stripe_connect_account_id, stripe_connect_payouts_enabled')
      .eq('id', repId)
      .maybeSingle(),
    supabaseAdmin
      .from('custom_users')
      .select('id, email, name, first_name')
      .eq('id', repId)
      .maybeSingle(),
    supabaseAdmin
      .from('commission_ledger')
      .select('id, commission_cents')
      .eq('rep_id', repId)
      .is('payout_id', null),
  ])

  if (!rep) {
    return { rep_id: repId, rep_email: user?.email || null, status: 'skipped_no_connect', amount_cents: 0, ledger_count: 0 }
  }
  if (rep.status === 'terminated') {
    return { rep_id: repId, rep_email: user?.email || null, status: 'skipped_terminated', amount_cents: 0, ledger_count: 0 }
  }
  if (!rep.stripe_connect_account_id || !rep.stripe_connect_payouts_enabled) {
    return { rep_id: repId, rep_email: user?.email || null, status: 'skipped_no_connect', amount_cents: 0, ledger_count: 0 }
  }

  const ledgerIds = (owed || []).map((r) => r.id)
  const totalCents = (owed || []).reduce((s, r) => s + (r.commission_cents || 0), 0)

  if (totalCents <= 0 || ledgerIds.length === 0) {
    return { rep_id: repId, rep_email: user?.email || null, status: 'skipped_no_owed', amount_cents: 0, ledger_count: 0 }
  }
  if (totalCents < MIN_PAYOUT_CENTS) {
    logger.info('Payout below minimum, rolling over', { repId, totalCents })
    return { rep_id: repId, rep_email: user?.email || null, status: 'skipped_too_small', amount_cents: totalCents, ledger_count: ledgerIds.length }
  }

  // 1. Create the payouts row first so we have an id for idempotency.
  const { data: payout, error: payoutErr } = await supabaseAdmin
    .from('payouts')
    .insert({
      rep_id: repId,
      amount_cents: totalCents,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'pending',
    })
    .select('id')
    .single()
  if (payoutErr || !payout) {
    logger.error('Payout row insert failed', { repId, error: payoutErr?.message })
    return {
      rep_id: repId, rep_email: user?.email || null,
      status: 'failed', amount_cents: totalCents, ledger_count: ledgerIds.length,
      failure_reason: payoutErr?.message || 'Failed to create payout row',
    }
  }

  // 2. Stripe transfer - keyed by payout.id so any retry hits the
  //    same idempotency record on Stripe's side.
  let transferId: string
  try {
    const transfer = await stripe.transfers.create({
      amount: totalCents,
      currency: 'usd',
      destination: rep.stripe_connect_account_id,
      description: `CloudGreet sales commission · ${periodStart} → ${periodEnd}`,
      metadata: {
        cloudgreet_payout_id: payout.id,
        cloudgreet_rep_id: repId,
        ledger_count: String(ledgerIds.length),
      },
    }, {
      idempotencyKey: `cgsales-payout-${payout.id}`,
    })
    transferId = transfer.id
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Unknown Stripe error'
    await supabaseAdmin
      .from('payouts')
      .update({ status: 'failed', failure_reason: reason })
      .eq('id', payout.id)
    logger.error('Stripe transfer failed', { repId, payoutId: payout.id, error: reason })
    return {
      rep_id: repId, rep_email: user?.email || null,
      status: 'failed', amount_cents: totalCents, ledger_count: ledgerIds.length,
      payout_id: payout.id, failure_reason: reason,
    }
  }

  // 3. Backfill payout_id on every ledger row IMMEDIATELY - before we
  //    stamp the payout row 'transferred'. If we crash here and re-run,
  //    the ledger rows are already marked paid so they won't be picked
  //    up again, even though the payouts row still says 'pending' (it
  //    gets reconciled on the next manual run).
  const { error: ledgerErr } = await supabaseAdmin
    .from('commission_ledger')
    .update({ payout_id: payout.id })
    .in('id', ledgerIds)
  if (ledgerErr) {
    logger.error('Ledger backfill failed AFTER transfer succeeded', {
      repId, payoutId: payout.id, transferId, error: ledgerErr.message,
    })
    // Continue anyway - money already moved. Surface to admin.
  }

  // 4. Mark the payout row transferred.
  await supabaseAdmin
    .from('payouts')
    .update({
      status: 'transferred',
      stripe_transfer_id: transferId,
      transferred_at: new Date().toISOString(),
    })
    .eq('id', payout.id)

  // 5. Notify rep.
  await sendPayoutEmail({
    to: user?.email || null,
    name: user?.first_name || user?.name || null,
    amountCents: totalCents,
    periodStart, periodEnd,
    transferId,
  })

  logger.info('Sales payout transferred', {
    repId, payoutId: payout.id, transferId, amountCents: totalCents,
  })

  return {
    rep_id: repId,
    rep_email: user?.email || null,
    status: 'transferred',
    amount_cents: totalCents,
    ledger_count: ledgerIds.length,
    payout_id: payout.id,
    stripe_transfer_id: transferId,
  }
}

async function sendPayoutEmail({
  to, name, amountCents, periodStart, periodEnd, transferId,
}: {
  to: string | null
  name: string | null
  amountCents: number
  periodStart: string
  periodEnd: string
  transferId: string
}): Promise<void> {
  if (!to) return
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return
  try {
    const resend = new Resend(resendKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'
    const replyTo = process.env.RESEND_REPLY_TO || 'anthony@cloudgreet.com'
    const greeting = name ? `Hey ${name},` : 'Hey,'
    const amount = `$${(amountCents / 100).toFixed(2)}`
    await resend.emails.send({
      from: `CloudGreet <${fromEmail}>`,
      to,
      replyTo,
      subject: `${amount} payout sent`,
      text:
`${greeting}

Your weekly commission payout went out today.

  Amount:   ${amount}
  Period:   ${periodStart} → ${periodEnd}
  Transfer: ${transferId}

It hits your bank in 1–2 business days via Stripe. See the breakdown
in your earnings page: https://cloudgreet.com/sales/earnings

- CloudGreet`,
    })
  } catch (e) {
    logger.warn('Payout email failed', {
      error: e instanceof Error ? e.message : 'Unknown',
    })
  }
}
