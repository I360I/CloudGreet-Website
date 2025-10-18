import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check if Telnyx is configured
    if (!process.env.TELNYX_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Telnyx not configured. Please add TELNYX_API_KEY to environment variables.'
      }, { status: 503 })
    }

    const body = await request.json()
    const { businessId, phoneNumberId } = body

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

    // Configure webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/voice-webhook`
    const smsWebhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'}/api/telnyx/sms-webhook`

    // Configure voice webhook for the phone number
    if (phoneNumberId) {
      const webhookConfig = {
        webhook_url: webhookUrl,
        webhook_failover_url: webhookUrl,
        webhook_api_version: '2'
      }

      const webhookResponse = await fetch(`https://api.telnyx.com/v2/phone_numbers/${phoneNumberId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookConfig)
      })

      if (!webhookResponse.ok) {
        const errorData = await webhookResponse.text()
        logger.error('Failed to configure Telnyx webhook', {
          status: webhookResponse.status,
          error: errorData,
          businessId: targetBusinessId,
          phoneNumberId
        })
        
        return NextResponse.json({
          success: false,
          message: 'Failed to configure webhook with Telnyx',
          details: errorData
        }, { status: 500 })
      }

      // Configure SMS webhook
      const smsWebhookResponse = await fetch(`https://api.telnyx.com/v2/phone_numbers/${phoneNumberId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID
        })
      })

      if (!smsWebhookResponse.ok) {
        logger.warn('Failed to configure SMS webhook', {
          status: smsWebhookResponse.status,
          businessId: targetBusinessId
        })
      }

      // Update business with webhook configuration
      await supabaseAdmin
        .from('businesses')
        .update({
          webhook_configured: true,
          webhook_url: webhookUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetBusinessId)

      logger.info('Telnyx webhook configured successfully', {
        businessId: targetBusinessId,
        phoneNumberId,
        webhookUrl
      })

      return NextResponse.json({
        success: true,
        message: 'Webhook configured successfully',
        webhookUrl,
        smsWebhookUrl,
        phoneNumberId
      })
    } else {
      // Configure webhook for all phone numbers belonging to this business
      const { data: phoneNumbers } = await supabaseAdmin
        .from('toll_free_numbers')
        .select('*')
        .eq('business_id', targetBusinessId)
        .eq('status', 'assigned')

      if (!phoneNumbers || phoneNumbers.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'No phone numbers found for this business'
        }, { status: 404 })
      }

      const webhookResults = []
      for (const phoneRecord of phoneNumbers) {
        if (phoneRecord.provider_id) {
          try {
            const webhookConfig = {
              webhook_url: webhookUrl,
              webhook_failover_url: webhookUrl,
              webhook_api_version: '2'
            }

            const webhookResponse = await fetch(`https://api.telnyx.com/v2/phone_numbers/${phoneRecord.provider_id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(webhookConfig)
            })

            if (webhookResponse.ok) {
              webhookResults.push({
                phoneNumber: phoneRecord.number,
                status: 'success'
              })
            } else {
              webhookResults.push({
                phoneNumber: phoneRecord.number,
                status: 'failed',
                error: await webhookResponse.text()
              })
            }
          } catch (error) {
            webhookResults.push({
              phoneNumber: phoneRecord.number,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }

      // Update business with webhook configuration
      await supabaseAdmin
        .from('businesses')
        .update({
          webhook_configured: true,
          webhook_url: webhookUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetBusinessId)

      logger.info('Telnyx webhooks configured for business', {
        businessId: targetBusinessId,
        results: webhookResults
      })

      return NextResponse.json({
        success: true,
        message: 'Webhooks configured for all phone numbers',
        webhookUrl,
        smsWebhookUrl,
        results: webhookResults
      })
    }

  } catch (error) {
    logger.error('Telnyx webhook configuration error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json({
      success: false,
      message: 'Failed to configure webhook'
    }, { status: 500 })
  }
}
