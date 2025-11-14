import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { logComplianceEvent } from '@/lib/compliance/logging'
import { validateAndFormatPhone } from '@/lib/phone-validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const businessSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  businessType: z.string().min(2, 'Business type is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  website: z.string().url('Website must be a valid URL').optional().or(z.literal('')),
  description: z.string().optional(),
  greetingMessage: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'casual']).optional()
})

async function resolveBusinessId(userId: string, businessId?: string | null) {
  if (businessId) {
    return businessId
  }

  const { data, error } = await supabaseAdmin
    .from('custom_users')
    .select('business_id')
    .eq('id', userId)
    .single()

  if (error) {
    logger.warn('Failed to resolve business for onboarding business step', { userId, error: error.message })
    return null
  }

  return data?.business_id ?? null
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = businessSchema.parse(body)

    const businessId = await resolveBusinessId(auth.userId, auth.businessId)
    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const formattedPhone = parsed.phone ? validateAndFormatPhone(parsed.phone) : null
    if (parsed.phone && !formattedPhone) {
      return NextResponse.json({ error: 'Phone number must be valid' }, { status: 422 })
    }

    const updates: Record<string, unknown> = {
      business_name: parsed.businessName,
      business_type: parsed.businessType,
      email: parsed.email,
      website: parsed.website || null,
      description: parsed.description || null,
      greeting_message:
        parsed.greetingMessage ||
        `Hello, thank you for calling ${parsed.businessName}. How can I help you today?`,
      tone: parsed.tone || 'professional',
      ai_tone: parsed.tone || 'professional',
      onboarding_step: 1,
      updated_at: new Date().toISOString()
    }

    if (parsed.address) updates.address = parsed.address
    if (parsed.city) updates.city = parsed.city
    if (parsed.state) updates.state = parsed.state
    if (parsed.zipCode) updates.zip_code = parsed.zipCode

    if (formattedPhone) {
      updates.phone = formattedPhone
      updates.phone_number = formattedPhone
    }

    const { error } = await supabaseAdmin
      .from('businesses')
      .update(updates)
      .eq('id', businessId)

    if (error) {
      logger.error('Failed to update business onboarding step', { error: error.message, businessId })
      return NextResponse.json({ error: 'Failed to update business profile' }, { status: 500 })
    }

    await logComplianceEvent({
      tenantId: businessId,
      channel: 'onboarding',
      eventType: 'business_profile',
      path: request.nextUrl.pathname,
      requestBody: parsed
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Onboarding business step error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten() },
        { status: 422 }
      )
    }

    return NextResponse.json({ error: 'Failed to save business profile' }, { status: 500 })
  }
}


