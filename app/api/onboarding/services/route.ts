import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const dayConfigSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:MM'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:MM'),
  enabled: z.boolean()
})

const servicesSchema = z.object({
  services: z.array(z.string().min(2)).min(1).optional(),
  serviceAreas: z.array(z.string().min(2)).optional(),
  timezone: z.string().min(2),
  businessHours: z.object({
    monday: dayConfigSchema,
    tuesday: dayConfigSchema,
    wednesday: dayConfigSchema,
    thursday: dayConfigSchema,
    friday: dayConfigSchema,
    saturday: dayConfigSchema,
    sunday: dayConfigSchema
  })
})

async function resolveBusinessId(userId: string, businessId?: string | null) {
  if (businessId) return businessId

  const { data } = await supabaseAdmin
    .from('custom_users')
    .select('business_id')
    .eq('id', userId)
    .single()

  return data?.business_id ?? null
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = servicesSchema.parse(body)

    const businessId = await resolveBusinessId(auth.userId, auth.businessId)
    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const updates = {
      services: parsed.services ?? [],
      service_areas: parsed.serviceAreas ?? [],
      business_hours: parsed.businessHours,
      timezone: parsed.timezone,
      onboarding_step: 2,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabaseAdmin
      .from('businesses')
      .update(updates)
      .eq('id', businessId)

    if (error) {
      logger.error('Failed to update services onboarding step', { error: error.message, businessId })
      return NextResponse.json({ error: 'Failed to save services' }, { status: 500 })
    }

    await logComplianceEvent({
      tenantId: businessId,
      channel: 'onboarding',
      eventType: 'services',
      path: request.nextUrl.pathname,
      requestBody: parsed
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Onboarding services step error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten() },
        { status: 422 }
      )
    }

    return NextResponse.json({ error: 'Failed to save services' }, { status: 500 })
  }
}


