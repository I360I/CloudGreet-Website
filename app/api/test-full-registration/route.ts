import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessName, businessType, email, password, phone, address } = body

    

    // Step 1: Create user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        first_name: businessName.split(' ')[0] || businessName,
        last_name: businessName.split(' ').slice(1).join(' ') || '',
        phone: phone,
        is_admin: false
      },
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({
        success: false,
        error: 'User creation failed',
        details: authError.message
      }, { status: 400 })
    }

    const user = authUser.user
    

    // Step 2: Create business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: user.id,
        business_name: businessName,
        business_type: businessType,
        email: email,
        phone: phone,
        phone_number: phone,
        address: address,
        city: 'Unknown',
        state: 'Unknown',
        zip_code: '00000',
        website: '',
        description: `Professional ${businessType} services`,
        services: ['General Services'],
        service_areas: ['Local Area'],
        business_hours: {
          monday: { open: '08:00', close: '17:00' },
          tuesday: { open: '08:00', close: '17:00' },
          wednesday: { open: '08:00', close: '17:00' },
          thursday: { open: '08:00', close: '17:00' },
          friday: { open: '08:00', close: '17:00' },
          saturday: { open: '09:00', close: '15:00' },
          sunday: { open: '09:00', close: '15:00' }
        },
        greeting_message: `Thank you for calling ${businessName}. How can I help you today?`,
        tone: 'professional',
        onboarding_completed: false,
        account_status: 'new_account',
        subscription_status: 'inactive'
      })
      .select()
      .single()

    if (businessError) {
      // Cleanup user
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      return NextResponse.json({
        success: false,
        error: 'Business creation failed',
        details: businessError.message,
        code: businessError.code
      }, { status: 400 })
    }

    

    // Step 3: Update user metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        business_id: business.id
      }
    })

    if (updateError) {
      logger.error('Failed to update user metadata', { error: updateError.message })
    }

    // Step 4: Create JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        businessId: business.id,
        role: 'owner',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
        iss: 'cloudgreet',
        aud: 'cloudgreet-api'
      },
      jwtSecret,
      { 
        algorithm: 'HS256',
        keyid: 'v1'
      }
    )

    

    return NextResponse.json({
      success: true,
      message: 'Full registration test successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          business_id: business.id
        },
        business: {
          id: business.id,
          business_name: business.business_name
        }
      }
    })

  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: 'Full registration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
