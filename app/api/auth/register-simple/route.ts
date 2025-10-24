import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessName, businessType, email, password, phone, address } = body

    // Basic validation (less strict)
    if (!businessName || !email || !password || !phone || !address) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 })
    }

    // Create user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      user_metadata: {
        first_name: businessName.split(' ')[0] || businessName,
        last_name: businessName.split(' ').slice(1).join(' ') || '',
        phone: phone.replace(/\D/g, ''),
        is_admin: false
      },
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({
        success: false,
        message: authError.message
      }, { status: 400 })
    }

    const user = authUser.user

    // Create business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: user.id,
        business_name: businessName,
        business_type: businessType,
        email: email.toLowerCase().trim(),
        phone: phone.replace(/\D/g, ''),
        phone_number: phone.replace(/\D/g, ''),
        address: address,
        city: '', // Will be filled during onboarding
        state: '', // Will be filled during onboarding
        zip_code: '', // Will be filled during onboarding
        website: '', // Will be filled during onboarding
        description: `Professional ${businessType} services`,
        services: [], // Will be filled during onboarding
        service_areas: [], // Will be filled during onboarding
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
      await supabaseAdmin.auth.admin.deleteUser(user.id)
      return NextResponse.json({
        success: false,
        message: businessError.message
      }, { status: 400 })
    }

    // Create JWT token
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
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          business_id: business.id,
          role: 'owner'
        },
        business: {
          id: business.id,
          business_name: business.business_name,
          business_type: business.business_type,
          onboarding_completed: business.onboarding_completed,
          phone_number: business.phone_number
        }
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed'
    }, { status: 500 })
  }
}
