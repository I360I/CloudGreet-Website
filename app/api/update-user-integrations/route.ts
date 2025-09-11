import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { getTenantContext } from '../../../lib/multi-tenant'

export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request)
    let userId: string
    
    if (!tenantContext) {
      // For testing purposes, use a test user ID
      userId = '00000000-0000-0000-0000-000000000001'
    } else {
      userId = tenantContext.userId
    }

    const { 
      phoneNumber, 
      retellAgentId, 
      calendarProvider, 
      calendarId, 
      stripeCustomerId 
    } = await request.json()

    // First check if user exists, if not create a test user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      // Create a test user for development with unique email
      const uniqueEmail = `test-${Date.now()}@example.com`
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          name: 'Test User',
          email: uniqueEmail,
          hashed_password: 'test',
          business_name: 'Test Business',
          business_type: 'hvac',
          phone_number: phoneNumber,
          retell_agent_id: retellAgentId,
          calendar_provider: calendarProvider,
          calendar_id: calendarId,
          stripe_customer_id: stripeCustomerId
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating test user:', createError)
        return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Test user created with integrations',
        user: newUser
      })
    }

    // Update existing user record with integration details
    const { data, error } = await supabase
      .from('users')
      .update({
        phone_number: phoneNumber,
        retell_agent_id: retellAgentId,
        calendar_provider: calendarProvider,
        calendar_id: calendarId,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user integrations:', error)
      return NextResponse.json({ error: 'Failed to update integrations' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User integrations updated successfully',
      user: data
    })

  } catch (error) {
    console.error('Error in update-user-integrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
