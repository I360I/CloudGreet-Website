import { NextRequest, NextResponse } from "next/server"
import { supabase } from '../../../lib/supabase'
import { handleApiError, validateUserId, createSuccessResponse } from '../../../lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    validateUserId(userId)

    // Fetch real phone integration data from database
    const { data: phoneIntegration, error } = await supabase
      .from('phone_integrations')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching phone integration:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch phone integration data' 
      }, { status: 500 })
    }

    // If no phone integration exists, return default structure
    const integrationData = phoneIntegration || {
      user_id: userId,
      phone_number: null,
      status: 'inactive',
      call_count: 0,
      last_call: null,
      agent_id: null,
      webhook_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return createSuccessResponse({
      phoneIntegration: integrationData
    })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, phoneNumber } = body

    validateUserId(userId)

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Action is required'
      }, { status: 400 })
    }

    switch (action) {
      case 'activate':
        // Activate phone number with real database operations
        const { data: existingIntegration, error: fetchError } = await supabase
          .from('phone_integrations')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error('Failed to check existing phone integration')
        }

        const integrationData = {
          user_id: userId,
          phone_number: phoneNumber || `+1 (555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          status: 'active',
          call_count: 0,
          last_call: null,
          agent_id: null,
          webhook_url: `${process.env.NEXTAUTH_URL}/api/retell-webhook`,
          updated_at: new Date().toISOString()
        }

        if (existingIntegration) {
          // Update existing integration
          const { error: updateError } = await supabase
            .from('phone_integrations')
            .update(integrationData)
            .eq('user_id', userId)

          if (updateError) {
            throw new Error('Failed to update phone integration')
          }
        } else {
          // Create new integration
          const { error: insertError } = await supabase
            .from('phone_integrations')
            .insert({
              ...integrationData,
              created_at: new Date().toISOString()
            })

          if (insertError) {
            throw new Error('Failed to create phone integration')
          }
        }

        return createSuccessResponse({
          message: 'Phone number activated successfully',
          phoneNumber: integrationData.phone_number,
          status: 'active'
        })

      case 'deactivate':
        // Deactivate phone number
        const { error: deactivateError } = await supabase
          .from('phone_integrations')
          .update({ 
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (deactivateError) {
          throw new Error('Failed to deactivate phone integration')
        }

        return createSuccessResponse({
          message: 'Phone number deactivated successfully',
          status: 'inactive'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Must be "activate" or "deactivate"'
        }, { status: 400 })
    }

  } catch (error) {
    return handleApiError(error)
  }
}