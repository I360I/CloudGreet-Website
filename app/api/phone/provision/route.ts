import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET' }, { status: 500 })
    }

    // Verify JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Check if business already has a phone number
    const { data: existingPhone, error: existingPhoneError } = await supabaseAdmin
      .from('phone_numbers')
      .select('id, phone_number, status')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .single()

    if (existingPhone && !existingPhoneError) {
      return NextResponse.json({
        success: true,
        message: 'Phone number already assigned',
        phoneNumber: existingPhone.phone_number,
        phoneId: existingPhone.id
      })
    }

    // Generate a demo phone number (in production, this would call Telnyx API)
    const demoPhoneNumber = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`
    
    // Create phone number record
    const { data: phoneNumber, error: phoneError } = await supabaseAdmin
      .from('phone_numbers')
      .insert({
        business_id: businessId,
        phone_number: demoPhoneNumber,
        provider: 'telnyx',
        status: 'active',
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`,
        sms_webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/sms-webhook`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (phoneError) {
      logger.error('Failed to create phone number', {
        error: phoneError.message,
        businessId,
        userId
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to provision phone number'
      }, { status: 500 })
    }

    // Update business with phone number
    const { error: businessUpdateError } = await supabaseAdmin
      .from('businesses')
      .update({
        phone_number: demoPhoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (businessUpdateError) {
      logger.error('Failed to update business with phone number', {
        error: businessUpdateError.message,
        businessId,
        phoneNumber: demoPhoneNumber
      })
    }

    logger.info('Phone number provisioned successfully', {
      businessId,
      userId,
      phoneNumber: demoPhoneNumber,
      phoneId: phoneNumber.id
    })

    return NextResponse.json({
      success: true,
      message: 'Phone number provisioned successfully',
      phoneNumber: demoPhoneNumber,
      phoneId: phoneNumber.id,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-webhook`
    })

  } catch (error) {
    logger.error('Phone number provisioning failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({
      success: false,
      error: 'Phone number provisioning failed'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Missing JWT_SECRET' }, { status: 500 })
    }

    // Verify JWT token
    let decoded
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decoded.userId
    const businessId = decoded.businessId

    if (!userId || !businessId) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 })
    }

    // Get phone numbers for business
    const { data: phoneNumbers, error: phoneError } = await supabaseAdmin
      .from('phone_numbers')
      .select('id, phone_number, status, provider, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (phoneError) {
      logger.error('Failed to fetch phone numbers', {
        error: phoneError.message,
        businessId
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch phone numbers'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phoneNumbers: phoneNumbers || [],
      count: phoneNumbers?.length || 0
    })

  } catch (error) {
    logger.error('Failed to fetch phone numbers', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch phone numbers'
    }, { status: 500 })
  }
}