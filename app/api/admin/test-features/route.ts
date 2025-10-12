import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require admin authentication
    const adminAuth = await requireAdmin(request)
    if (adminAuth.error) {
      return adminAuth.response
    }
    
    const body = await request.json()
    const { testType, phoneNumber, message, businessId } = body

    switch (testType) {
      case 'sms':
        return await testSMS(phoneNumber, message)
      case 'voice':
        return await testVoiceCall(phoneNumber, businessId)
      case 'email':
        return await testEmail(body.email, body.subject)
      case 'health':
        return await testSystemHealth()
      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Admin test features error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'admin/test-features',
      method: 'POST'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function testSMS(phoneNumber: string, message: string) {
  try {
    // Use Telnyx to send test SMS
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.TELNYX_PHONE_NUMBER || process.env.TELNYX_BUSINESS_PHONE || '+17372448305',
        to: phoneNumber,
        text: `[TEST] ${message}`,
        messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID
      })
    })

    if (!telnyxResponse.ok) {
      throw new Error('Failed to send SMS via Telnyx')
    }

    const result = await telnyxResponse.json()

    // Log the test SMS
    await supabaseAdmin
      .from('sms_messages')
      .insert({
        business_id: 'admin-test',
        phone_number: phoneNumber,
        message: `[TEST] ${message}`,
        status: 'sent',
        telnyx_message_id: result.data.id,
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Test SMS sent successfully',
      telnyxId: result.data.id
    })
  } catch (error) {
    logger.error('SMS test failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      phoneNumber,
      message 
    })
    return NextResponse.json({ error: 'Failed to send test SMS' }, { status: 500 })
  }
}

async function testVoiceCall(phoneNumber: string, businessId: string) {
  try {
    // Use Telnyx to initiate test call
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.TELNYX_PHONE_NUMBER || process.env.TELNYX_BUSINESS_PHONE || '+17372448305',
        to: phoneNumber,
        connection_id: process.env.TELNYX_CONNECTION_ID,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-handler`,
        webhook_failover_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/telnyx/voice-handler`
      })
    })

    if (!telnyxResponse.ok) {
      throw new Error('Failed to initiate call via Telnyx')
    }

    const result = await telnyxResponse.json()

    // Log the test call
    await supabaseAdmin
      .from('calls')
      .insert({
        business_id: businessId || 'admin-test',
        caller_phone: phoneNumber,
        business_phone: process.env.TELNYX_PHONE_NUMBER || process.env.TELNYX_BUSINESS_PHONE || '+17372448305',
        status: 'initiated',
        call_type: 'test_call',
        telnyx_call_id: result.data.id,
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Test call initiated successfully',
      callId: result.data.id
    })
  } catch (error) {
    logger.error('Voice test failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      phoneNumber,
      businessId 
    })
    return NextResponse.json({ error: 'Failed to initiate test call' }, { status: 500 })
  }
}

async function testEmail(email: string, subject: string) {
  try {
    // Send test email notification
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'test_email',
        message: `Test email: ${subject}`,
        email: email,
        businessId: 'admin-test'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send test email')
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully'
    })
  } catch (error) {
    logger.error('Email test failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      email,
      subject 
    })
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}

async function testSystemHealth() {
  try {
    // Test database connection
    const { data: businesses, error: dbError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .limit(1)

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    // Test Telnyx API
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/balance', {
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
      }
    })

    if (!telnyxResponse.ok) {
      throw new Error('Telnyx API connection failed')
    }

    // Test OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      }
    })

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API connection failed')
    }

    // Test Resend API (Email service)
    const resendResponse = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      }
    })

    if (!resendResponse.ok) {
      throw new Error('Resend API connection failed')
    }

    return NextResponse.json({
      success: true,
      message: 'All systems healthy',
      checks: {
        database: 'connected',
        telnyx: 'connected',
        openai: 'connected',
        resend: 'connected'
      }
    })
  } catch (error) {
    logger.error('Health check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ 
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
