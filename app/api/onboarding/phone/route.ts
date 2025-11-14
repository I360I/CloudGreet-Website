import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { validateAndFormatPhone } from '@/lib/phone-validation'
import { TelnyxClient } from '@/lib/telnyx'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const phoneSchema = z.object({
  existingNumber: z.string().optional(),
  areaCode: z
    .string()
    .regex(/^\d{3}$/, 'Area code must be 3 digits')
    .optional(),
  label: z.string().optional()
}).refine(
  (data) => data.existingNumber || data.areaCode,
  'Provide an existingNumber or an areaCode'
)

async function resolveBusinessId(userId: string, businessId?: string | null) {
  if (businessId) return businessId
  const { data } = await supabaseAdmin
    .from('custom_users')
    .select('business_id')
    .eq('id', userId)
    .single()
  return data?.business_id ?? null
}

async function assignNumberToBusiness(businessId: string, businessName: string, phoneNumber: string) {
  const { data: existingNumber } = await supabaseAdmin
    .from('toll_free_numbers')
    .select('id')
    .eq('number', phoneNumber)
    .maybeSingle()

  if (existingNumber) {
    await supabaseAdmin
      .from('toll_free_numbers')
      .update({
        status: 'assigned',
        assigned_to: businessId,
        business_name: businessName,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingNumber.id)
  } else {
    await supabaseAdmin.from('toll_free_numbers').insert({
      number: phoneNumber,
      status: 'assigned',
      assigned_to: businessId,
      business_name: businessName,
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = phoneSchema.parse(body)

    const businessId = await resolveBusinessId(auth.userId, auth.businessId)
    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_name, onboarding_step')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    let phoneNumber: string | null = null

    if (parsed.existingNumber) {
      const formatted = validateAndFormatPhone(parsed.existingNumber)
      if (!formatted) {
        return NextResponse.json({ error: 'Provided number is not valid' }, { status: 422 })
      }
      phoneNumber = formatted
      await assignNumberToBusiness(businessId, business.business_name, phoneNumber)
    } else if (parsed.areaCode) {
      if (!process.env.TELNYX_API_KEY && !process.env.TELYNX_API_KEY) {
        return NextResponse.json(
          { error: 'Telnyx API key missing. Provide an existing number instead.' },
          { status: 400 }
        )
      }

      const telnyx = new TelnyxClient()
      try {
        const response = await telnyx.provisionPhoneNumber(parsed.areaCode)
        const provisionedNumber =
          response?.data?.phone_number ||
          response?.data?.number ||
          response?.data?.phoneNumber ||
          response?.data?.id ||
          null

        if (!provisionedNumber) {
          throw new Error('Provisioned number missing from Telnyx response')
        }

        const formatted = validateAndFormatPhone(provisionedNumber)
        if (!formatted) {
          throw new Error('Provisioned number invalid format')
        }

        phoneNumber = formatted
        await assignNumberToBusiness(businessId, business.business_name, phoneNumber)
      } catch (error) {
        logger.error('Telnyx provisioning failed during onboarding', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        return NextResponse.json(
          { error: 'Failed to provision number from Telnyx. Provide an existing number or try again.' },
          { status: 502 }
        )
      }
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number could not be determined' }, { status: 500 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        phone_number: phoneNumber,
        phone: phoneNumber,
        onboarding_step: Math.max(4, business.onboarding_step ?? 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      logger.error('Failed to save phone number for onboarding', { error: updateError.message, businessId })
      return NextResponse.json({ error: 'Failed to save phone number' }, { status: 500 })
    }

    await logComplianceEvent({
      tenantId: businessId,
      channel: 'onboarding',
      eventType: 'phone_assignment',
      path: request.nextUrl.pathname,
      requestBody: {
        source: parsed.existingNumber ? 'existing' : 'provisioned',
        label: parsed.label ?? null
      }
    })

    return NextResponse.json({ success: true, phoneNumber })
  } catch (error) {
    logger.error('Onboarding phone step error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten() },
        { status: 422 }
      )
    }

    return NextResponse.json({ error: 'Failed to configure phone number' }, { status: 500 })
  }
}


