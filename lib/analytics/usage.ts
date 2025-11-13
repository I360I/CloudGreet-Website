import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

const DAY_MS = 24 * 60 * 60 * 1000

export type UsageTrendPoint = {
  label: string
  calls: number
  outreach: number
  appointments: number
}

export type UsageAnalytics = {
  summary: {
    calls30: number
    calls7: number
    avgCallDuration: number
    appointments30: number
    outreach30: number
    pipelineRevenue: number
    conversionRate: number
  }
  trends: UsageTrendPoint[]
  churn: {
    riskLevel: 'low' | 'medium' | 'high'
    healthScore: number
    drivers: string[]
  }
  recentCalls: Array<{
    id: string
    createdAt: string
    duration: number
    outcome: string | null
    recordingUrl: string | null
    transcript: string | null
    serviceRequested: string | null
  }>
}

export async function getUsageAnalytics(businessId: string): Promise<UsageAnalytics> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)

  try {
    const [
      sequencesResult,
      callsResult,
      callsLast7Result,
      outreachResult,
      appointmentsResult,
      callDetailsResult,
      outreachAllResult
    ] = await Promise.all([
      supabaseAdmin.from('outreach_sequences').select('id').eq('business_id', businessId),
      supabaseAdmin
        .from('calls')
        .select('id')
        .eq('business_id', businessId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabaseAdmin
        .from('calls')
        .select('id')
        .eq('business_id', businessId)
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabaseAdmin
        .from('outreach_events')
        .select('id, created_at, sequence_id')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabaseAdmin
        .from('appointments')
        .select('id, estimated_value, created_at, status')
        .eq('business_id', businessId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabaseAdmin
        .from('calls')
        .select('id, created_at, call_duration, conversion_outcome, recording_url, transcript, service_requested')
        .eq('business_id', businessId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(25),
      supabaseAdmin
        .from('outreach_events')
        .select('id, sequence_id, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
    ])

    const sequenceIds = sequencesResult.data?.map((sequence) => sequence.id) ?? []

    const filteredOutreach = sequenceIds.length
      ? outreachResult.data?.filter((event) => sequenceIds.includes(event.sequence_id ?? '')) ?? []
      : []
    const filteredOutreachAll = sequenceIds.length
      ? outreachAllResult.data?.filter((event) => sequenceIds.includes(event.sequence_id ?? '')) ?? []
      : []

    const calls30 = callsResult.data?.length ?? 0
    const calls7 = callsLast7Result.data?.length ?? 0
    const outreach30 = filteredOutreach.length

    const appointments = appointmentsResult.data ?? []
    const appointments30 = appointments.length

    const successfulAppointments = appointments.filter((appointment) => appointment.status === 'completed')
    const pipelineRevenue = appointments.reduce((total, appointment) => {
      const value = Number(appointment.estimated_value ?? 0)
      return total + (Number.isNaN(value) ? 0 : value)
    }, 0)

    const conversionRate = calls30 > 0 ? Math.round((appointments30 / calls30) * 100) : 0
    const avgCallDuration = (() => {
      const calls = callDetailsResult.data ?? []
      if (!calls.length) return 0
      const totalDuration = calls.reduce((total, call) => total + (call.call_duration ?? 0), 0)
      return Math.round(totalDuration / calls.length)
    })()

    const trendBuckets: UsageTrendPoint[] = []
    for (let weekOffset = 5; weekOffset >= 0; weekOffset -= 1) {
      const periodStart = new Date(now.getTime() - weekOffset * 7 * DAY_MS)
      const periodEnd = new Date(periodStart.getTime() + 7 * DAY_MS)

      const callsCount =
        (callDetailsResult.data ?? []).filter((call) => {
          const createdAt = call.created_at ? new Date(call.created_at) : null
          return createdAt && createdAt >= periodStart && createdAt < periodEnd
        }).length ?? 0

      const outreachCount =
        filteredOutreachAll.filter((event) => {
          const createdAt = event.created_at ? new Date(event.created_at) : null
          return createdAt && createdAt >= periodStart && createdAt < periodEnd
        }).length ?? 0

      const appointmentCount = appointments.filter((appointment) => {
        const createdAt = appointment.created_at ? new Date(appointment.created_at) : null
        return createdAt && createdAt >= periodStart && createdAt < periodEnd
      }).length

      trendBuckets.push({
        label: periodStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        calls: callsCount,
        outreach: outreachCount,
        appointments: appointmentCount
      })
    }

    let healthScore = 50
    const drivers: string[] = []

    if (calls7 >= 5) {
      healthScore += 15
      drivers.push('Healthy inbound call volume')
    } else if (calls7 <= 1) {
      healthScore -= 10
      drivers.push('Inbound call volume is very low')
    }

    if (outreach30 >= 20) {
      healthScore += 10
      drivers.push('Outreach automation running consistently')
    } else if (outreach30 === 0) {
      healthScore -= 10
      drivers.push('Outreach automation idle')
    }

    if (conversionRate >= 30) {
      healthScore += 10
      drivers.push('High call-to-appointment conversion')
    } else if (conversionRate < 10 && calls30 >= 5) {
      healthScore -= 10
      drivers.push('Low conversion rate; QA scripts and knowledge base')
    }

    if (pipelineRevenue >= 5000) {
      healthScore += 5
      drivers.push('Strong revenue pipeline in last 30 days')
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'medium'
    if (healthScore >= 75) riskLevel = 'low'
    if (healthScore < 60) riskLevel = 'medium'
    if (healthScore < 45) riskLevel = 'high'

    return {
      summary: {
        calls30,
        calls7,
        avgCallDuration,
        appointments30,
        outreach30,
        pipelineRevenue: Math.round(pipelineRevenue),
        conversionRate
      },
      trends: trendBuckets,
      churn: {
        riskLevel,
        healthScore: Math.max(20, Math.min(healthScore, 95)),
        drivers
      },
      recentCalls:
        callDetailsResult.data?.map((call) => ({
          id: call.id,
          createdAt: call.created_at,
          duration: call.call_duration ?? 0,
          outcome: call.conversion_outcome ?? null,
          recordingUrl: call.recording_url ?? null,
          transcript: call.transcript ?? null,
          serviceRequested: call.service_requested ?? null
        })) ?? []
    }
  } catch (error) {
    logger.error('Failed to compute usage analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      businessId
    })
    throw error
  }
}

