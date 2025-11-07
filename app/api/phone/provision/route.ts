import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Phone Number Provisioning
 * 
 * Automatically assigns an available toll-free number from inventory to a business.
 * This is called during onboarding to give each business their own phone number.
 * 
 * Process:
 * 1. Find next available toll-free number (status='available')
 * 2. Assign it to the business
 * 3. Update business record with phone number
 * 4. Mark number as 'assigned' in toll_free_numbers table
 * 5. Return the assigned phone number
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
    const userId = authResult.userId

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

    // Check if business already has a toll-free number assigned
    const { data: existingAssignment } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('number, status')
      .eq('assigned_to', businessId)
      .eq('status', 'assigned')
      .single()

    if (existingAssignment) {
      logger.info('Business already has phone number assigned', {
        businessId,
        phoneNumber: existingAssignment.number
      })
      return NextResponse.json({
        success: true,
        phoneNumber: existingAssignment.number,
        alreadyAssigned: true,
        message: 'Phone number already assigned'
      })
    }

    // Find next available toll-free number
    const { data: availableNumber, error: numberError } = await supabaseAdmin
      .from('toll_free_numbers')
      .select('id, number')
      .eq('status', 'available')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (numberError || !availableNumber) {
      logger.error('No available phone numbers in inventory', {
        businessId,
        error: numberError?.message
      })
      return NextResponse.json(
        {
          error: 'No available phone numbers',
          message: 'All phone numbers are currently assigned. Please contact support or wait for a number to become available.'
        },
        { status: 503 }
      )
    }

    // Assign the number to the business
    const { error: assignError } = await supabaseAdmin
      .from('toll_free_numbers')
      .update({
        status: 'assigned',
        assigned_to: businessId,
        business_name: business.business_name,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', availableNumber.id)

    if (assignError) {
      logger.error('Failed to assign phone number', {
        businessId,
        numberId: availableNumber.id,
        error: assignError.message
      })
      return NextResponse.json(
        { error: 'Failed to assign phone number' },
        { status: 500 }
      )
    }

    // Update business record with the toll-free number
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        phone_number: availableNumber.number,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      logger.error('Failed to update business with phone number', {
        businessId,
        phoneNumber: availableNumber.number,
        error: updateError.message
      })
      // Try to rollback the assignment
      await supabaseAdmin
        .from('toll_free_numbers')
        .update({
          status: 'available',
          assigned_to: null,
          business_name: null,
          assigned_at: null
        })
        .eq('id', availableNumber.id)
      
      return NextResponse.json(
        { error: 'Failed to update business record' },
        { status: 500 }
      )
    }

    logger.info('Phone number successfully provisioned', {
      businessId,
      phoneNumber: availableNumber.number,
      userId
    })

    return NextResponse.json({
      success: true,
      phoneNumber: availableNumber.number,
      message: 'Phone number successfully assigned'
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

