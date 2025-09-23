import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { telynyxClient } from '@/lib/telynyx'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      error_message: 'Telynyx SMS webhook is ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract SMS information from Telynyx webhook
    const {
      message_id,
      from_number,
      to_number,
      message_body,
      direction,
      status,
      timestamp
    } = body
    
    // Find business by phone number
    const { data: business, error: businessError } = await supabaseAdmin()
      .from('businesses')
      .select(`
        id,
        business_name,
        phone_number,
        sms_forwarding_enabled,
        ai_agents(
          id,
          status,
          prompt_template
        )
      `)
      .eq('phone_number', to_number)
      .single()
    
    if (businessError || !business) {
      // Log unknown number SMS
      await supabaseAdmin()
        .from('sms_logs')
        .insert({
          message_id: message_id || 'unknown',
          from_number: from_number || 'unknown',
          to_number: to_number || 'unknown',
          error_message: message_body || '',
          direction: direction || 'inbound',
          status: status || 'received',
          created_at: new Date().toISOString()
        } as any)
      
      return NextResponse.json({
        success: true,
        error_message: 'SMS logged - unknown number'
      })
    }
    
    // Log the SMS
    await supabaseAdmin()
      .from('sms_logs')
      .insert({
        message_id: message_id || 'unknown',
        business_id: (business as any).id,
        from_number: from_number || 'unknown',
        to_number: to_number || 'unknown',
        error_message: message_body || '',
        direction: direction || 'inbound',
        status: status || 'received',
        created_at: new Date().toISOString()
      } as any)
    
    // Handle special commands
    const message = message_body?.toLowerCase().trim()
    
    if (message === 'stop') {
      // Handle STOP command
      await supabaseAdmin()
        .from('sms_opt_outs')
        .insert({
          phone_number: from_number,
          business_id: (business as any).id,
          opt_out_reason: 'stop_command',
          created_at: new Date().toISOString()
        } as any)
      
      // Send confirmation
      await telynyxClient.sendSMS(
        from_number,
        'You have been unsubscribed from SMS messages from ' + (business as any).business_name + '. Reply START to resubscribe.',
        to_number
      )
      
      return NextResponse.json({
        success: true,
        action: 'opt_out_confirmed'
      })
    }
    
    if (message === 'start') {
      // Handle START command
      await supabaseAdmin()
        .from('sms_opt_outs')
        .delete()
        .eq('phone_number', from_number)
        .eq('business_id', (business as any).id)
      
      // Send confirmation
      await telynyxClient.sendSMS(
        from_number,
        'You have been resubscribed to SMS messages from ' + (business as any).business_name + '. Reply STOP to unsubscribe.',
        to_number
      )
      
      return NextResponse.json({
        success: true,
        action: 'opt_in_confirmed'
      })
    }
    
    if (message === 'help') {
      // Send help message
      await telynyxClient.sendSMS(
        from_number,
        `Reply STOP to unsubscribe from ${(business as any).business_name} SMS messages. Reply START to resubscribe. For assistance, call us directly.`,
        to_number
      )
      
      return NextResponse.json({
        success: true,
        action: 'help_sent'
      })
    }
    
    // Check if SMS forwarding is enabled
    if ((business as any).sms_forwarding_enabled) {
      // Forward to business owner (simplified for build)
      try {
        await telynyxClient.sendSMS(
          (business as any).phone_number,
          `SMS from ${from_number}: ${message_body}`,
          to_number
        )
        } catch (forwardError) {
          // Log error to database
          try {
            await supabaseAdmin().from('error_logs').insert({
              error_type: 'api_error',
              error_message: 'Failed to forward SMS in webhook',
              details: forwardError instanceof Error ? forwardError.message : 'Unknown error',
              business_id: (business as any).id,
              created_at: new Date().toISOString()
            } as any)
          } catch (logError) {
            // Fallback logging
          }
        }
    }
    
    // Get AI agent for automated responses
    const aiAgent = (business as any).ai_agents?.[0]
    
    if (aiAgent && aiAgent.status === 'active') {
      // Generate AI response (simplified for build)
      const aiResponse = `Thank you for contacting ${(business as any).business_name}. We received your error_message: "${message_body}". Our team will get back to you shortly. For immediate assistance, please call us.`
      
      // Send AI response
      await telynyxClient.sendSMS(
        from_number,
        aiResponse,
        to_number
      )
    }
    
    return NextResponse.json({
      success: true,
      error_message: 'SMS processed successfully',
      business_id: (business as any).id,
      action: 'processed'
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'SMS webhook error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process SMS webhook'
    }, { status: 500 })
  }
}
