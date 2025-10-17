import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // AUTH CHECK: Verify business access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const jwtSecret = process.env.JWT_SECRET
    const decoded = jwt.verify(token, jwtSecret) as any
    const businessId = decoded.businessId
    
    if (!businessId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    const { from, to, text, message_id, forwardTo } = body
    
    // Get business forwarding settings from database
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('notification_phone, owner_phone')
      .eq('id', businessId)
      .single()
    
    const forwardPhone = forwardTo || business?.notification_phone || business?.owner_phone
    
    if (!forwardPhone) {
      return NextResponse.json({ error: 'No forward phone number configured' }, { status: 400 })
    }

    // Log the incoming SMS
    logger.info('SMS received', {
      from,
      to,
      text,
      message_id
    })

    // Store SMS in database
    const { data: smsLog, error: smsError } = await supabaseAdmin
      .from('sms_messages')
      .insert({
        from_number: from,
        to_number: to,
        message_text: text,
        message_id: message_id,
        direction: 'inbound',
        status: 'received',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (smsError) {
      logger.error('Error storing SMS log', { 
        error: smsError,  
        body 
      })
    }

    // Forward SMS to your personal phone
    try {
      const forwardResponse = await fetch('https://api.telnyx.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.BUSINESS_PHONE || '+18333956731',
          to: process.env.PERSONAL_PHONE || '+17372960092',
          text: `[CloudGreet SMS] From: ${from}\nMessage: ${text}`,
          type: 'SMS'
        })
      })

      if (forwardResponse.ok) {
        logger.info('SMS forwarded successfully', {
          from: process.env.BUSINESS_PHONE || '+18333956731',
          to: process.env.PERSONAL_PHONE || '+17372960092',
          original_from: from,
          original_text: text
        })
      } else {
        logger.error('Failed to forward SMS', { 
          error: new Error('Telynyx API error'), 
          status: forwardResponse.status,
          statusText: forwardResponse.statusText
        })
      }
    } catch (error) {
      logger.error('Error forwarding SMS', { 
        error: error instanceof Error ? error.message : 'Unknown error',  
        body 
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('SMS forward error', { 
      error: error instanceof Error ? error.message : 'Unknown error',  
      endpoint: 'sms/forward' 
    })
    return NextResponse.json({ error: 'Failed to process SMS' }, { status: 500 })
  }
}
