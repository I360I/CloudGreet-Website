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
    // Try to get user record, but don't fail if it doesn't exist
    let userRecord = null
    let businessId = auth.businessId || null
    
    try {
      const { data, error: userError } = await supabaseAdmin
        .from('custom_users')
        .select('id, business_id, first_name, last_name, email')
        .eq('id', auth.userId)
        .single()

      if (!userError && data) {
        userRecord = data
        businessId = data.business_id || businessId
      } else if (userError) {
        logger.warn('Unable to resolve user for onboarding state', { userId: auth.userId, userError: userError.message })
      }
    } catch (userErr) {
      logger.warn('Error fetching user record', { userId: auth.userId, error: userErr instanceof Error ? userErr.message : 'Unknown' })
    }

    // If no business ID, return empty state
    if (!businessId) {
      return NextResponse.json({
        success: true,
        business: null,
        onboarding: {
          completed: false,
          step: 0
        },
        user: userRecord ? {
          id: userRecord.id,
          first_name: userRecord.first_name,
          last_name: userRecord.last_name,
          email: userRecord.email
        } : null,
        tollFreeInventory: {
          available: 0
        }
      })
    }

    // Try to get business, but handle errors gracefully
    let business = null
    try {
      const { data: businessData, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()

      if (!businessError && businessData) {
        business = businessData
      } else if (businessError) {
        logger.warn('Business not found for onboarding state', { businessId, error: businessError.message })
        // Return empty state instead of error
        return NextResponse.json({
          success: true,
          business: null,
          onboarding: {
            completed: false,
            step: 0
          },
          user: userRecord ? {
            id: userRecord.id,
            first_name: userRecord.first_name,
            last_name: userRecord.last_name,
            email: userRecord.email
          } : null,
          tollFreeInventory: {
            available: 0
          }
        })
      }
    } catch (businessErr) {
      logger.warn('Error fetching business', { businessId, error: businessErr instanceof Error ? businessErr.message : 'Unknown' })
      // Return empty state instead of error
      return NextResponse.json({
        success: true,
        business: null,
        onboarding: {
          completed: false,
          step: 0
        },
        user: userRecord ? {
          id: userRecord.id,
          first_name: userRecord.first_name,
          last_name: userRecord.last_name,
          email: userRecord.email
        } : null,
        tollFreeInventory: {
          available: 0
        }
      })
    }

    // Get inventory count, but don't fail if table doesn't exist
    let inventoryCount = 0
    try {
      const { count, error: inventoryError } = await supabaseAdmin
        .from('toll_free_numbers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'available')
      inventoryCount = count ?? 0
      if (inventoryError) {
        logger.warn('Error fetching inventory', { error: inventoryError.message })
        inventoryCount = 0
      }
    } catch (inventoryErr) {
      logger.warn('Error fetching inventory', { error: inventoryErr instanceof Error ? inventoryErr.message : 'Unknown' })
      inventoryCount = 0
    }

    return NextResponse.json({
      success: true,
      business: business ? {
        id: business.id,
        business_name: business.business_name,
        business_type: business.business_type,
        email: business.email,
        phone: business.phone || business.phone_number,
        phone_number: business.phone_number || business.phone,
        address: business.address,
        city: business.city,
        state: business.state,
        zip_code: business.zip_code,
        website: business.website,
        services: business.services,
        service_areas: business.service_areas,
        business_hours: business.business_hours,
        timezone: business.timezone,
        calendar_connected: business.calendar_connected,
        onboarding_completed: business.onboarding_completed,
        onboarding_step: business.onboarding_step,
        onboarding_data: business.onboarding_data,
        stripe_customer_id: business.stripe_customer_id,
        retell_agent_id: business.retell_agent_id,
        greeting_message: business.greeting_message,
        tone: business.tone || business.ai_tone,
        description: business.description
      } : null,
      onboarding: {
        completed: business?.onboarding_completed ?? false,
        step: business?.onboarding_step ?? 0,
        canResume: !business?.onboarding_completed && (business?.onboarding_step ?? 0) > 0
      },
      user: userRecord ? {
        id: userRecord.id,
        first_name: userRecord.first_name,
        last_name: userRecord.last_name,
        email: userRecord.email
      } : null,
      tollFreeInventory: {
        available: inventoryCount
      }
    })
  } catch (error) {
    logger.error('Unexpected onboarding state error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to load onboarding state' }, { status: 500 })
  }
}


