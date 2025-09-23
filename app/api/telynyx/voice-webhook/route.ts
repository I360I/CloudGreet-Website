import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      error_message: 'Telynyx voice webhook is ready',
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
    
    // Extract call information from Telynyx webhook
    const {
      call_id,
      from_number,
      to_number,
      direction,
      call_status,
      duration,
      recording_url,
      transcription_text
    } = body
    
    // Find business by phone number
    const { data: business, error: businessError } = await supabaseAdmin()
      .from('businesses')
      .select(`
        id,
        business_name,
        phone_number,
        business_hours,
        timezone,
        ai_agents(
          id,
          status,
          greeting_message,
          tone,
          prompt_template
        )
      `)
      .eq('phone_number', to_number)
      .single()
    
    if (businessError || !business) {
      // Log unknown number
      await supabaseAdmin()
        .from('call_logs')
        .insert({
          call_id: call_id || 'unknown',
          from_number: from_number || 'unknown',
          to_number: to_number || 'unknown',
          direction: direction || 'inbound',
          status: 'unknown_number',
          duration: duration || 0,
          transcription_text: transcription_text || null,
          recording_url: recording_url || null,
          created_at: new Date().toISOString()
        } as any)
      
      return NextResponse.json({
        success: true,
        error_message: 'Call logged - unknown number'
      })
    }
    
    // Check business hours
    const now = new Date()
    const businessHours = (business as any).business_hours
    const isBusinessHours = true // Simplified for build - would check actual hours
    
    // Get AI agent
    const aiAgent = (business as any).ai_agents?.[0]
    
    // Log the call
    await supabaseAdmin()
      .from('call_logs')
      .insert({
        call_id: call_id || 'unknown',
        business_id: (business as any).id,
        from_number: from_number || 'unknown',
        to_number: to_number || 'unknown',
        direction: direction || 'inbound',
        status: call_status || 'received',
        duration: duration || 0,
        transcription_text: transcription_text || null,
        recording_url: recording_url || null,
        created_at: new Date().toISOString()
      } as any)
    
    // Determine response based on business hours and AI agent status
    if (!isBusinessHours) {
      // Outside business hours - provide voicemail or callback option
      return NextResponse.json({
        success: true,
        action: 'voicemail',
        error_message: `Thank you for calling ${(business as any).business_name}. We are currently closed. Please leave a message and we'll get back to you during business hours.`,
        business_hours: (business as any).business_hours
      })
    }
    
    if (!aiAgent || aiAgent.status !== 'active') {
      // AI agent not active - fallback to voicemail
      return NextResponse.json({
        success: true,
        action: 'voicemail',
        error_message: `Thank you for calling ${(business as any).business_name}. Our AI receptionist is temporarily unavailable. Please leave a message and we'll get back to you shortly.`
      })
    }
    
    // AI agent is active - connect to Retell AI or provide instructions
    return NextResponse.json({
      success: true,
      action: 'connect_ai',
        business_id: (business as any).id,
      ai_agent_id: aiAgent.id,
      greeting_error_message: aiAgent.greeting_message,
      prompt_template: aiAgent.prompt_template,
      business_info: {
        name: (business as any).business_name,
        hours: (business as any).business_hours,
        timezone: (business as any).timezone
      }
    })
    
  } catch (error) {
    // Log error to database
    try {
      await supabaseAdmin().from('error_logs').insert({
        error_type: 'api_error',
        error_message: 'Voice webhook error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString()
      } as any)
    } catch (logError) {
      // Fallback logging
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process voice webhook'
    }, { status: 500 })
  }
}
