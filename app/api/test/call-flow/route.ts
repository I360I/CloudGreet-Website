import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessId, testPhoneNumber } = body

    // Get authentication token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    
    const decoded = jwt.verify(token, jwtSecret) as any
    const targetBusinessId = businessId || decoded.businessId

    if (!targetBusinessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get business info
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', targetBusinessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (!business.phone_number || business.phone_number === 'Not configured') {
      return NextResponse.json({
        success: false,
        message: 'No phone number configured for this business'
      }, { status: 400 })
    }

    // Get AI agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('business_id', targetBusinessId)
      .eq('is_active', true)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({
        success: false,
        message: 'No active AI agent found for this business'
      }, { status: 400 })
    }

    // Simulate a test call by creating a call log entry
    const testCallData = {
      business_id: targetBusinessId,
      caller_phone: testPhoneNumber || '+15551234567',
      caller_name: 'Test Caller',
      duration: 0, // Will be updated when call ends
      status: 'in_progress',
      service_requested: 'Test Call',
      satisfaction_rating: null,
      transcript: 'Test call initiated to verify webhook functionality',
      created_at: new Date().toISOString()
    }

    const { data: callLog, error: callLogError } = await supabaseAdmin
      .from('calls')
      .insert(testCallData)
      .select()
      .single()

    if (callLogError) {
      throw new Error(`Failed to create test call log: ${callLogError.message}`)
    }

    // Test webhook response format
    const webhookTestData = {
      data: {
        event_type: 'call.answered',
        payload: {
          call_control_id: `test-${Date.now()}`,
          from: testPhoneNumber || '+15551234567',
          to: business.phone_number,
          call_leg_id: `leg-${Date.now()}`,
          call_session_id: `session-${Date.now()}`,
          direction: 'inbound',
          state: 'answered',
          recording_urls: [],
          transcription_text: '',
          duration: 0,
          caller_name: 'Test Caller',
          caller_city: 'Test City',
          caller_state: 'Test State',
          caller_country: 'US'
        }
      }
    }

    // Test the webhook endpoint
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telynyx/voice-webhook`
    
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookTestData)
      })

      const webhookResult = await webhookResponse.json()

      // Update call log with webhook test results
      await supabaseAdmin
        .from('calls')
        .update({
          status: 'completed',
          duration: 30, // 30 second test call
          transcript: `Webhook test completed. Response: ${JSON.stringify(webhookResult)}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', callLog.id)

      logger.info('Call flow test completed', {
        businessId: targetBusinessId,
        webhookUrl,
        webhookStatus: webhookResponse.status,
        callLogId: callLog.id
      })

      return NextResponse.json({
        success: true,
        message: 'Call flow test completed successfully',
        testResults: {
          webhookUrl,
          webhookStatus: webhookResponse.status,
          webhookResponse: webhookResult,
          callLogId: callLog.id,
          businessPhone: business.phone_number,
          agentActive: agent.is_active,
          agentGreeting: agent.greeting_message
        }
      })

    } catch (webhookError) {
      // Update call log with error
      await supabaseAdmin
        .from('calls')
        .update({
          status: 'failed',
          transcript: `Webhook test failed: ${webhookError instanceof Error ? webhookError.message : 'Unknown error'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', callLog.id)

      return NextResponse.json({
        success: false,
        message: 'Webhook test failed',
        error: webhookError instanceof Error ? webhookError.message : 'Unknown error',
        callLogId: callLog.id
      })
    }

  } catch (error) {
    logger.error('Call flow test error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      success: false,
      message: 'Failed to test call flow'
    }, { status: 500 })
  }
}
