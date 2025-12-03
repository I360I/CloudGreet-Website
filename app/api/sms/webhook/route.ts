import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { verifyTelynyxSignature } from '@/lib/webhook-verification'
import { logComplianceEvent } from '@/lib/compliance/logging'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function normalizeCommand(text: string) {
  return (text || '').trim().toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text()
    
    // Verify webhook signature (Telnyx)
    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')
    
    // Skip verification in development, require in production
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyTelynyxSignature(rawBody, signature, timestamp)
      if (!isValid) {
        logger.warn('SMS webhook signature verification failed', {
          hasSignature: !!signature,
          hasTimestamp: !!timestamp
        })
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    }

    // Parse JSON body after verification
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      logger.error('SMS webhook JSON parse error', { error: parseError instanceof Error ? parseError.message : JSON.stringify(parseError) })
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 })
    }

    const from: string = body.from || body.From || ''
    const to: string = body.to || body.To || ''
    const text: string = body.text || body.Body || ''
    const cmd = normalizeCommand(text)

    if (!from) {
      return NextResponse.json({ success: false, error: 'from required' }, { status: 400 })
    }

    // Find business by phone number (to number is business phone)
    let businessId: string | null = null
    if (to) {
      try {
        const { data: business } = await supabaseAdmin
          .from('businesses')
          .select('id')
          .eq('phone_number', to)
          .or(`phone.eq.${to}`)
          .single()
        
        if (business) {
          businessId = business.id
        }
      } catch (businessError) {
        logger.warn('Could not find business for SMS', { 
          to, 
          error: businessError instanceof Error ? businessError.message : 'Unknown' 
        })
      }
    }

    // Track compliance event
    await logComplianceEvent({
      tenantId: businessId,
      channel: 'sms',
      eventType: cmd || 'message',
      path: request.nextUrl.pathname,
      requestBody: { from, to, text }
    })

    // Track consent actions for TCPA/A2P compliance
    if (cmd === 'STOP' || cmd === 'UNSTOP' || cmd === 'HELP') {
      try {
        await supabaseAdmin.from('consents').insert({
          phone: from,
          action: cmd,
          channel: 'sms',
          created_at: new Date().toISOString()
        })
      } catch (consentError) {
        // Log but don't fail - consents table may not exist yet
        logger.warn('Failed to log consent action', { 
          error: consentError instanceof Error ? consentError.message : 'Unknown',
          action: cmd,
          phone: from
        })
      }
    }

    // Store SMS message in database (if not a command)
    if (cmd !== 'STOP' && cmd !== 'UNSTOP' && cmd !== 'HELP' && businessId) {
      try {
        await supabaseAdmin.from('sms_messages').insert({
          business_id: businessId,
          from_number: from,
          to_number: to,
          message: text,
          message_text: text,
          direction: 'inbound',
          status: 'delivered',
          created_at: new Date().toISOString()
        })
        logger.info('SMS message stored', { businessId, from, to })
      } catch (smsError) {
        // Log but don't fail - sms_messages table may have different schema
        logger.warn('Failed to store SMS message', { 
          error: smsError instanceof Error ? smsError.message : 'Unknown',
          businessId,
          from,
          to
        })
      }
    }

    // Respond per A2P
    if (cmd === 'STOP') {
      return NextResponse.json({ message: 'You have been opted out. Reply UNSTOP to rejoin.' })
    }
    if (cmd === 'UNSTOP') {
      return NextResponse.json({ message: 'You have been opted in again. Reply STOP to opt out; HELP for help.' })
    }
    if (cmd === 'HELP') {
      return NextResponse.json({ message: 'CloudGreet: Reply STOP to opt out; HELP for help.' })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('SMS webhook error', { error: (error as Error).message })
    return NextResponse.json({ success: false }, { status: 500 })
  }
}


