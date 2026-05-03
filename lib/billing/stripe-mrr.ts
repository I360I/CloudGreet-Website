import Stripe from 'stripe'
import { getStripeClient } from '@/lib/billing/stripe-client'

export type StripeMrrSummary = {
  totalMrrCents: number
  paidMrrCents: number
  trialingMrrCents: number
  paidCount: number
  trialingCount: number
  pastDueCount: number
  pastDueMrrCents: number
  // For ops UI: list of subs with bare metadata so the dashboard can
  // show "who's on trial" without a second round-trip.
  subscriptions: Array<{
    id: string
    customerId: string
    status: Stripe.Subscription.Status
    monthlyCents: number
    currentPeriodEnd: number | null
    trialEnd: number | null
    cancelAtPeriodEnd: boolean
    cloudgreetBusinessId: string | null
    metadataPlan: string | null
  }>
}

/**
 * Live, Stripe-sourced MRR aggregation for the admin billing view.
 *
 * Why we don't read from a local ledger: the local billing_usage_ledger
 * table is never written from the Stripe webhook, so any MRR value
 * derived from it is always 0. Pulling straight from Stripe is the only
 * source that's both accurate and trial-aware.
 *
 * Trials count toward MRR (the user wants visibility into committed
 * monthly value, not just collected cash) but are tracked separately so
 * the admin page can display "$X total · $Y paid · $Z trialing".
 */
export async function getStripeMrrSummary(): Promise<StripeMrrSummary> {
  const stripe = getStripeClient()

  // Pull every non-canceled subscription. Stripe paginates at 100; we
  // walk pages so the early-stage account isn't capped at 100 subs.
  const subs: Stripe.Subscription[] = []
  let startingAfter: string | undefined = undefined
  for (let i = 0; i < 20; i++) {
    const page: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
      starting_after: startingAfter,
    })
    subs.push(...page.data)
    if (!page.has_more) break
    startingAfter = page.data[page.data.length - 1]?.id
    if (!startingAfter) break
  }

  const summary: StripeMrrSummary = {
    totalMrrCents: 0,
    paidMrrCents: 0,
    trialingMrrCents: 0,
    paidCount: 0,
    trialingCount: 0,
    pastDueCount: 0,
    pastDueMrrCents: 0,
    subscriptions: [],
  }

  for (const sub of subs) {
    if (sub.status === 'canceled' || sub.status === 'incomplete_expired' || sub.status === 'unpaid') {
      continue
    }
    const monthlyCents = monthlyRevenueCents(sub)
    summary.subscriptions.push({
      id: sub.id,
      customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      status: sub.status,
      monthlyCents,
      currentPeriodEnd: sub.current_period_end ?? null,
      trialEnd: sub.trial_end ?? null,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      cloudgreetBusinessId: (sub.metadata?.cloudgreet_business_id as string) || null,
      metadataPlan: (sub.metadata?.plan as string) || null,
    })

    if (sub.status === 'active') {
      summary.totalMrrCents += monthlyCents
      summary.paidMrrCents += monthlyCents
      summary.paidCount += 1
    } else if (sub.status === 'trialing') {
      summary.totalMrrCents += monthlyCents
      summary.trialingMrrCents += monthlyCents
      summary.trialingCount += 1
    } else if (sub.status === 'past_due') {
      summary.pastDueCount += 1
      summary.pastDueMrrCents += monthlyCents
      // past_due still counts toward MRR — the customer is on the hook,
      // Stripe is just retrying. If we exclude these, MRR jitters down
      // every time a card fails and recovers.
      summary.totalMrrCents += monthlyCents
      summary.paidMrrCents += monthlyCents
    }
    // Other statuses (paused, incomplete) deliberately skipped — they
    // aren't generating revenue and shouldn't inflate the headline.
  }

  return summary
}

/**
 * Normalize a subscription's items into a per-month cents value.
 * Handles the common Stripe intervals; returns 0 for things we don't
 * understand rather than throwing, so a single weird sub can't blank
 * the whole admin page.
 */
function monthlyRevenueCents(sub: Stripe.Subscription): number {
  let total = 0
  for (const item of sub.items.data) {
    const price = item.price
    if (!price || price.unit_amount == null) continue
    const qty = item.quantity ?? 1
    const amount = price.unit_amount * qty
    const interval = price.recurring?.interval
    const intervalCount = price.recurring?.interval_count ?? 1
    if (!interval) continue
    let monthly = 0
    if (interval === 'month') {
      monthly = amount / intervalCount
    } else if (interval === 'year') {
      monthly = amount / (12 * intervalCount)
    } else if (interval === 'week') {
      monthly = (amount * 4.345) / intervalCount
    } else if (interval === 'day') {
      monthly = (amount * 30) / intervalCount
    }
    total += monthly
  }
  return Math.round(total)
}
