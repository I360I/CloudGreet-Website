import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Get Business Profile
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.userId
    const businessId = authResult.businessId || request.nextUrl.searchParams.get('businessId')

    // Get business profile
    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId || authResult.businessId)
      .eq('owner_id', userId)
      .single()

    if (error || !business) {
      logger.error('Failed to fetch business profile', { 
        error: error instanceof Error ? error.message : String(error), 
        userId, 
        businessId 
      })
      return NextResponse.json(
        { success: false, message: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        businessName: business.business_name,
        businessType: business.business_type,
        services: business.services || [],
        businessHours: business.business_hours || {},
        phoneNumber: business.phone_number || business.phone,
        email: business.email,
        address: business.address,
        city: business.city,
        state: business.state,
        zipCode: business.zip_code,
        website: business.website
      }
    })
  } catch (error) {
    logger.error('Error fetching business profile', { error: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json(
      { success: false, message: 'Failed to fetch business profile' },
      { status: 500 }
    )
  }
}

