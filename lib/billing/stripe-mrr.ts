import Stripe from 'stripe'
import { getStripeClient } from '@/lib/billing/stripe-client'

export type StripeMrrSummary = {
  totalMrrCents: number
  paidMrrCents: number
  compedMrrCents: number
  paidCount: number
  compedCount: number
  pastDueCount: number
  pastDueMrrCents: number
  // For ops UI: list of subs with bare metadata so the dashboard can
  // show who's currently being billed without a second round-trip.
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
 * source that's both accurate and discount-aware.
 *
 * Comped subs (100%-off coupons) count toward MRR for committed-value
 * visibility but are tracked separately so the admin page can display
 * "$X total · $Y paid · $Z comped".
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
    compedMrrCents: 0,
    paidCount: 0,
    compedCount: 0,
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

    // A 100%-off coupon makes Stripe report status='active' even though
    // the customer is paying nothing this period - counting that as
    // "Paid" makes the dashboard lie. Bucket those (and any genuine
    // status='trialing' subs from older test data) as "Comped" so the
    // headline still reflects committed MRR but the breakdown honestly
    // separates collected cash from discounted seats.
    const effectivelyFree = isCurrentlyDiscountedToZero(sub)

    if (sub.status === 'active' && !effectivelyFree) {
      summary.totalMrrCents += monthlyCents
      summary.paidMrrCents += monthlyCents
      summary.paidCount += 1
    } else if (sub.status === 'trialing' || (sub.status === 'active' && effectivelyFree)) {
      summary.totalMrrCents += monthlyCents
      summary.compedMrrCents += monthlyCents
      summary.compedCount += 1
    } else if (sub.status === 'past_due') {
      summary.pastDueCount += 1
      summary.pastDueMrrCents += monthlyCents
      // past_due still counts toward MRR - the customer is on the hook,
      // Stripe is just retrying. If we exclude these, MRR jitters down
      // every time a card fails and recovers.
      summary.totalMrrCents += monthlyCents
      summary.paidMrrCents += monthlyCents
    }
    // Other statuses (paused, incomplete) deliberately skipped - they
    // aren't generating revenue and shouldn't inflate the headline.
  }

  return summary
}

/**
 * Is this subscription currently being charged $0 because of a discount?
 * A 100%-off coupon makes Stripe keep the subscription in 'active', so
 * relying on status alone misclassifies comped accounts as paid.
 *
 * We treat the sub as "effectively free" when:
 *   - there's a discount currently applied (sub.discount is not null), AND
 *   - the coupon is 100% off OR amount_off ≥ the recurring price, AND
 *   - the discount hasn't expired (end is null = forever, or end > now).
 */
function isCurrentlyDiscountedToZero(sub: Stripe.Subscription): boolean {
  const discount = (sub as any).discount as Stripe.Discount | null | undefined
  if (!discount?.coupon) return false
  // Expired? (end is unix seconds; null means forever / no expiry)
  if (discount.end && discount.end < Math.floor(Date.now() / 1000)) return false
  const coupon = discount.coupon
  if (coupon.percent_off === 100) return true
  if (coupon.amount_off && coupon.amount_off > 0) {
    // Compare against this period's monthly price. If the dollar discount
    // is ≥ the line total, the customer pays nothing.
    const monthly = monthlyRevenueCents(sub)
    if (monthly > 0 && coupon.amount_off >= monthly) return true
  }
  return false
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
