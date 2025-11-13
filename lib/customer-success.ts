import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export type ActivationMilestones = {
  onboardingCompleted: boolean
  onboardingStep: number
  calendarConnected: boolean
  numberProvisioned: boolean
  outreachRunning: boolean
  firstCallHandled: boolean
  createdAt: string
  lastCallAt: string | null
  lastOutreachAt: string | null
  callsLast7Days: number
  outreachLast7Days: number
}

export type CustomerSuccessSnapshot = {
  businessId: string
  businessName: string
  ownerName: string | null
  ownerEmail: string | null
  subscriptionStatus: string | null
  accountAgeDays: number
  onboardingLagDays: number
  healthScore: number
  alerts: string[]
  activation: ActivationMilestones
}

const DAYS = 24 * 60 * 60 * 1000

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export async function getCustomerSuccessSnapshot(businessId: string): Promise<CustomerSuccessSnapshot> {
  const now = new Date()
  try {
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select(
        'id, business_name, owner_id, onboarding_completed, onboarding_step, calendar_connected, subscription_status, created_at, updated_at'
      )
      .eq('id', businessId)
      .maybeSingle()

    if (businessError) {
      throw businessError
    }

    if (!business) {
      throw new Error('Business not found')
    }

    const accountCreated = new Date(business.created_at ?? now.toISOString())
    const accountAgeDays = Math.floor((now.getTime() - accountCreated.getTime()) / DAYS)

    const [{ data: owner }, { data: assignedNumber }, sequencesResult, latestCallResult, callsLast7Result] =
      await Promise.all([
        supabaseAdmin
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', business.owner_id)
          .maybeSingle(),
        supabaseAdmin
          .from('toll_free_numbers')
          .select('id')
          .eq('assigned_to', business.id)
          .limit(1),
        supabaseAdmin
          .from('outreach_sequences')
          .select('id')
          .eq('business_id', business.id),
        supabaseAdmin
          .from('calls')
          .select('created_at')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabaseAdmin
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .gte('created_at', new Date(now.getTime() - 7 * DAYS).toISOString())
      ])

    const sequenceIds = (sequencesResult?.data ?? []).map((sequence) => sequence.id)

    let outreachLast7Days = 0
    let lastOutreachAt: string | null = null

    if (sequenceIds.length > 0) {
      const [recentEvents, recentCount] = await Promise.all([
        supabaseAdmin
          .from('outreach_events')
          .select('created_at')
          .in('sequence_id', sequenceIds)
          .order('created_at', { ascending: false })
          .limit(1),
        supabaseAdmin
          .from('outreach_events')
          .select('id', { count: 'exact', head: true })
          .in('sequence_id', sequenceIds)
          .gte('created_at', new Date(now.getTime() - 7 * DAYS).toISOString())
      ])

      outreachLast7Days = recentCount?.count ?? 0
      lastOutreachAt = recentEvents?.data?.[0]?.created_at ?? null
    }

    const callsLast7Days = callsLast7Result?.count ?? 0
    const lastCallAt = latestCallResult?.data?.[0]?.created_at ?? null

    const activation: ActivationMilestones = {
      onboardingCompleted: Boolean(business.onboarding_completed),
      onboardingStep: business.onboarding_step ?? 0,
      calendarConnected: Boolean(business.calendar_connected),
      numberProvisioned: Boolean(assignedNumber?.length),
      outreachRunning: outreachLast7Days > 0,
      firstCallHandled: Boolean(lastCallAt),
      createdAt: business.created_at,
      lastCallAt,
      lastOutreachAt,
      callsLast7Days,
      outreachLast7Days
    }

    let healthScore = 50
    if (activation.onboardingCompleted) healthScore += 15
    if (activation.calendarConnected) healthScore += 10
    if (activation.numberProvisioned) healthScore += 10
    if (activation.firstCallHandled) healthScore += 10
    if (activation.outreachRunning) healthScore += 5
    if (callsLast7Days === 0) healthScore -= 15
    if (outreachLast7Days === 0 && sequenceIds.length > 0) healthScore -= 10
    if (business.subscription_status !== 'active') healthScore -= 10

    const alerts: string[] = []

    if (!activation.onboardingCompleted && accountAgeDays > 3) {
      alerts.push('Onboarding incomplete after 3+ days. Reach out with the day-3 concierge script.')
    }

    if (!activation.firstCallHandled && accountAgeDays > 7) {
      alerts.push('No calls handled yet. Schedule a live test call with the client.')
    }

    if (activation.firstCallHandled && callsLast7Days === 0) {
      alerts.push('No calls handled in the last 7 days. Confirm routing and re-engage the client.')
    }

    if (sequenceIds.length > 0 && outreachLast7Days === 0) {
      alerts.push('Outreach sequences are idle. Review throttling and deliverability settings.')
    }

    if (business.subscription_status !== 'active') {
      alerts.push('Subscription not marked as active. Confirm Stripe status and invoices.')
    }

    const onboardingLagDays = activation.onboardingCompleted
      ? Math.max(
          0,
          Math.floor(
            (new Date(business.updated_at ?? now.toISOString()).getTime() - accountCreated.getTime()) / DAYS
          )
        )
      : accountAgeDays

    const snapshot: CustomerSuccessSnapshot = {
      businessId: business.id,
      businessName: business.business_name,
      ownerName: owner ? `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim() || null : null,
      ownerEmail: owner?.email ?? null,
      subscriptionStatus: business.subscription_status ?? null,
      accountAgeDays,
      onboardingLagDays,
      healthScore: clamp(healthScore, 10, 100),
      alerts,
      activation
    }

    return snapshot
  } catch (error) {
    logger.error('Failed to build customer success snapshot', {
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId
    })
    throw error
  }
}

