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
      return NextResponse.json({ error: 'Missing JWT_SECRET environment variable' }, { status: 500 })
    }

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

    const body = await request.json()
    const { to, message, type = 'manual_reply' } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'Phone number and message are required' }, { status: 400 })
    }

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_name, phone_number, notification_phone')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if Telnyx is configured
    if (!process.env.TELNYX_API_KEY) {
      return NextResponse.json({ 
        error: 'SMS service not configured' 
      }, { status: 503 })
    }

    // Send SMS via Telnyx
    const fromNumber = business.phone_number || business.notification_phone
    if (!fromNumber) {
      return NextResponse.json({ 
        error: 'Business phone number not configured' 
      }, { status: 400 })
    }

    const smsResponse = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromNumber,
        to: to,
        text: message,
        messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID
      })
    })

    if (!smsResponse.ok) {
      const errorData = await smsResponse.text()
      logger.error('Failed to send SMS', { 
        error: errorData, 
        from: fromNumber, 
        to, 
        businessId 
      })
      return NextResponse.json({ 
        error: 'Failed to send SMS' 
      }, { status: 500 })
    }

    const smsData = await smsResponse.json()

    // Store SMS in database
    await supabaseAdmin
      .from('sms_messages')
      .insert({
        business_id: businessId,
        from_number: fromNumber,
        to_number: to,
        message: message,
        direction: 'outbound',
        status: 'sent',
        message_id: smsData.data.id,
        created_at: new Date().toISOString()
      })

    logger.info('SMS sent successfully', { 
      from: fromNumber, 
      to, 
      businessId, 
      messageId: smsData.data.id 
    })

    return NextResponse.json({
      success: true,
      messageId: smsData.data.id,
      message: 'SMS sent successfully'
    })

  } catch (error) {
    logger.error('Error sending SMS', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send SMS' 
    }, { status: 500 })
  }
}
