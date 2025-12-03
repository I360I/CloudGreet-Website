import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { supabaseAdmin } from '@/lib/supabase'
import { provisionPhoneFromInventory } from '@/lib/phone-provisioning'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Phone Number Provisioning
 * 
 * Automatically assigns an available toll-free number from inventory to a business.
 * This is called during onboarding to give each business their own phone number.
 * 
 * Uses shared provisioning utility for consistent behavior across the application.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const businessId = authResult.businessId

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, phone_number')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      logger.error('Business not found for phone provisioning', {
        businessId,
        error: businessError?.message
      })
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Use shared provisioning utility
    const result = await provisionPhoneFromInventory(
      businessId,
      business.business_name,
      true // Link to agent if present
    )

    if (!result.success) {
      const statusCode = result.error === 'No available phone numbers' ? 503 : 500
      return NextResponse.json(
        {
          error: result.error || 'Failed to provision phone number',
          message: result.message
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      phoneNumber: result.phoneNumber,
      alreadyAssigned: result.alreadyAssigned,
      message: result.message || 'Phone number successfully assigned'
    })

  } catch (error) {
    logger.error('Phone provisioning failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      {
        error: 'Failed to provision phone number',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Check if business has a phone number assigned
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.success || !authResult.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const businessId = authResult.businessId

    // Check if business has a toll-free number assigned
    const { data: assignment } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('number, status, assigned_at')
      .eq('assigned_to', businessId)
      .eq('status', 'assigned')
      .single()

    if (assignment) {
      return NextResponse.json({
        hasPhoneNumber: true,
        phoneNumber: assignment.number,
        assignedAt: assignment.assigned_at
      })
    }

    // Check business record for phone number
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('phone_number')
      .eq('id', businessId)
      .single()

    return NextResponse.json({
      hasPhoneNumber: !!business?.phone_number,
      phoneNumber: business?.phone_number || null
    })

  } catch (error) {
    logger.error('Failed to check phone number status', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { error: 'Failed to check phone number status' },
      { status: 500 }
    )
  }
}

