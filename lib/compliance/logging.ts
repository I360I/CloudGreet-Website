import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export interface ComplianceLogInput {
  tenantId?: string | null
  channel: 'voice' | 'sms' | 'email' | 'onboarding'
  eventType?: string
  path?: string
  requestBody?: unknown
  metadata?: Record<string, unknown>
}

function maskPhone(value: unknown): unknown {
  if (typeof value === 'string' && value.replace(/\D/g, '').length >= 8) {
    return value.slice(0, 2) + '****' + value.slice(-2)
  }
  return value
}

function scrubPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map(scrubPayload)
  }
  if (payload && typeof payload === 'object') {
    return Object.entries(payload as Record<string, unknown>).reduce((acc, [key, value]) => {
      const lower = key.toLowerCase()
      if (
        lower.includes('phone') ||
        lower.includes('number') ||
        lower === 'from' ||
        lower === 'to'
      ) {
        acc[key] = maskPhone(value)
      } else {
        acc[key] = scrubPayload(value)
      }
      return acc
    }, {} as Record<string, unknown>)
  }
  return payload
}

export async function logComplianceEvent(input: ComplianceLogInput) {
  try {
    const payload = {
      tenant_id: input.tenantId ?? null,
      channel: input.channel,
      event_type: input.eventType ?? 'unknown',
      path: input.path ?? null,
      metadata: {
        ...input.metadata,
        request: scrubPayload(input.requestBody)
      }
    }

    const { error } = await supabaseAdmin.from('compliance_events').insert(payload)
    if (error) {
      logger.error('Failed to log compliance event', {
        error: error.message,
        channel: input.channel,
        path: input.path
      })
    }
  } catch (error) {
    logger.error('Compliance logging encountered an error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export interface ComplianceAuditResponse {
  events: Array<{
    id: string
    channel: string
    eventType: string
    path: string | null
    createdAt: string
    metadata: Record<string, unknown>
  }>
}

export async function fetchComplianceEvents(limit = 30): Promise<ComplianceAuditResponse> {
  const { data, error } = await supabaseAdmin
    .from('compliance_events')
    .select('id, channel, event_type, path, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Failed to fetch compliance events', { error: error.message })
    throw new Error('Unable to load compliance events')
  }

  return {
    events:
      data?.map((row) => ({
        id: row.id,
        channel: row.channel,
        eventType: row.event_type,
        path: row.path,
        createdAt: row.created_at,
        metadata: row.metadata || {}
      })) ?? []
  }
}


