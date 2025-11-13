import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('custom_users')
      .select('id, business_id, first_name, last_name, email')
      .eq('id', auth.userId)
      .single()

    if (userError) {
      logger.warn('Unable to resolve user for onboarding state', { userId: auth.userId, userError })
    }

    const businessId = userRecord?.business_id || auth.businessId || null

    if (!businessId) {
      return NextResponse.json({
        success: true,
        business: null,
        onboarding: {
          completed: false,
          step: 0
        },
        tollFreeInventory: {
          available: 0
        }
      })
    }

    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select(
        `id,
         business_name,
         business_type,
         email,
         phone,
         phone_number,
         address,
         city,
         state,
         zip_code,
         website,
         services,
         service_areas,
         business_hours,
         timezone,
         calendar_connected,
         onboarding_completed,
         onboarding_step,
         onboarding_data,
         stripe_customer_id,
         retell_agent_id,
         google_access_token,
         google_refresh_token,
         google_token_expires_at`
      )
      .eq('id', businessId)
      .single()

    if (error) {
      logger.error('Failed to load onboarding state', { error, businessId })
      return NextResponse.json({ error: 'Failed to load onboarding state' }, { status: 500 })
    }

    const { data: inventory } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('id')
      .eq('status', 'available')

    return NextResponse.json({
      success: true,
      business,
      onboarding: {
        completed: business?.onboarding_completed ?? false,
        step: business?.onboarding_step ?? 0,
        canResume: !business?.onboarding_completed && (business?.onboarding_step ?? 0) > 0
      },
      user: {
        id: userRecord?.id,
        first_name: userRecord?.first_name,
        last_name: userRecord?.last_name,
        email: userRecord?.email
      },
      tollFreeInventory: {
        available: inventory?.length ?? 0
      }
    })
  } catch (error) {
    logger.error('Unexpected onboarding state error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to load onboarding state' }, { status: 500 })
  }
}


